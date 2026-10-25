using System.Text.Json;
using System.Text.Json.Serialization;
using Bank101.Api.Core;
using Bank101.Api.Core.Json;
using Bank101.Api.Core.Security;
using Bank101.Api.Data;
using Bank101.Api.Endpoints;
using Microsoft.AspNetCore.Authentication.JwtBearer;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

// The Python side reads bare env vars (DATABASE_URL, JWT_SECRET_KEY, ...) via
// pydantic-settings. The same names are used here so one .env drives either backend.
builder.Configuration.AddEnvironmentVariables();

var projectName = builder.Configuration["PROJECT_NAME"] ?? "BANK101";
var apiPrefix = builder.Configuration["API_V1_PREFIX"] ?? "/api/v1";
var databaseUrl = builder.Configuration["DATABASE_URL"] ?? "Host=localhost;Database=bank101";

builder.Services.Configure<JwtSettings>(options =>
{
    options.JwtSecretKey = builder.Configuration["JWT_SECRET_KEY"] ?? options.JwtSecretKey;
    options.Algorithm = builder.Configuration["ALGORITHM"] ?? options.Algorithm;
    if (int.TryParse(builder.Configuration["ACCESS_TOKEN_EXPIRE_MINUTES"], out var minutes))
        options.AccessTokenExpireMinutes = minutes;
});

var jwtSettings = new JwtSettings
{
    JwtSecretKey = builder.Configuration["JWT_SECRET_KEY"] ?? "CHANGE_ME_IN_PRODUCTION",
    Algorithm = builder.Configuration["ALGORITHM"] ?? "HS256",
};

// JSON on the wire must match what Pydantic produced: snake_case names, decimals as
// strings, nulls kept (the frontend reads refresh_token / kyc_verified_at as null).
builder.Services.ConfigureHttpJsonOptions(options =>
{
    options.SerializerOptions.PropertyNamingPolicy = JsonNamingPolicy.SnakeCaseLower;
    options.SerializerOptions.PropertyNameCaseInsensitive = true;
    options.SerializerOptions.DefaultIgnoreCondition = JsonIgnoreCondition.Never;
    options.SerializerOptions.Converters.Add(new DecimalAsStringConverter());
    options.SerializerOptions.Converters.Add(new NullableDecimalAsStringConverter());
});

builder.Services.AddDbContext<BankDbContext>(options =>
{
    if (!DatabaseUrl.IsPostgres(databaseUrl) && databaseUrl.Contains("://", StringComparison.Ordinal))
    {
        throw new InvalidOperationException(
            $"Unsupported DATABASE_URL scheme in '{databaseUrl}'. This backend targets PostgreSQL; " +
            "the Python app's sqlite:// fallback has no equivalent here.");
    }

    options.UseNpgsql(DatabaseUrl.ToNpgsqlConnectionString(databaseUrl));
});

builder.Services.AddScoped<TokenService>();
builder.Services.AddScoped<DemoProvisioner>();

builder.Services.AddAuthentication(JwtBearerDefaults.AuthenticationScheme)
    .AddJwtBearer(options =>
    {
        // Without this, .NET rewrites "sub" into the long ClaimTypes.NameIdentifier
        // URI and TokenService.GetUserId would not find the claim python-jose wrote.
        options.MapInboundClaims = false;

        options.TokenValidationParameters = new TokenValidationParameters
        {
            // python-jose only checks the signature and exp unless an audience/issuer
            // is passed, and create_access_token sets neither. Matching that keeps
            // tokens minted by the Python backend valid here.
            ValidateIssuer = false,
            ValidateAudience = false,
            ValidateLifetime = true,
            ValidateIssuerSigningKey = true,
            IssuerSigningKey = TokenService.SigningKey(jwtSettings),
            ValidAlgorithms = [TokenService.MapAlgorithm(jwtSettings.Algorithm)],
            // .NET allows 5 minutes of clock skew by default; python-jose allows none.
            ClockSkew = TimeSpan.Zero,
            NameClaimType = "sub",
        };

        // Emit FastAPI's 401 body instead of an empty response, so clients that read
        // `detail` keep working.
        options.Events = new JwtBearerEvents
        {
            OnChallenge = async context =>
            {
                context.HandleResponse();
                context.Response.StatusCode = StatusCodes.Status401Unauthorized;
                context.Response.Headers.WWWAuthenticate = "Bearer";
                context.Response.ContentType = "application/json";

                // FastAPI distinguishes the two: OAuth2PasswordBearer answers a missing
                // header with "Not authenticated", while get_current_user answers a
                // present-but-unusable token with "Could not validate credentials".
                var message = context.Request.Headers.ContainsKey("Authorization")
                    ? "Could not validate credentials"
                    : "Not authenticated";

                await context.Response.WriteAsJsonAsync(new ErrorResponse(message));
            },
        };
    });

builder.Services.AddAuthorization();
builder.Services.AddOpenApi();

var app = builder.Build();

app.UseAuthentication();
app.UseAuthorization();

app.MapGet("/", () => Results.Ok(new { service = projectName, status = "ok" }));

// Health check endpoint for load balancers.
app.MapGet("/health", () => Results.Ok(new { status = "healthy" }));

app.MapOpenApi();

// All API v1 routes (auth, accounts) live under API_V1_PREFIX.
var v1 = app.MapGroup(apiPrefix);
v1.MapAuthEndpoints();
v1.MapAccountEndpoints();

app.Run();

// Exposed so an integration-test host can reference this assembly.
public partial class Program;
