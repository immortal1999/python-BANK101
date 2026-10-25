using System.Security.Claims;
using Bank101.Api.Core;
using Bank101.Api.Core.Security;
using Bank101.Api.Data;
using Bank101.Api.Dtos;
using Bank101.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Bank101.Api.Endpoints;

public static class AuthEndpoints
{
    public static void MapAuthEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/auth").WithTags("auth");

        group.MapPost("/register", RegisterAsync);
        group.MapPost("/login", LoginAsync);
        group.MapGet("/me", ReadMeAsync).RequireAuthorization();
    }

    /// <summary>Create a new user (inserts one row into the users table).</summary>
    private static async Task<IResult> RegisterAsync(
        UserCreate payload,
        BankDbContext db,
        DemoProvisioner provisioner,
        CancellationToken ct)
    {
        var validator = new FieldValidator()
            .Email("email", payload.Email)
            .String("username", payload.Username, minLength: 3, maxLength: 30)
            .String("password", payload.Password, minLength: 12, maxLength: 128)
            .String("full_name", payload.FullName, minLength: 2, maxLength: 100)
            .Required("date_of_birth", payload.DateOfBirth)
            .String("address", payload.Address, minLength: 5, maxLength: 255)
            .String("phone_number", payload.PhoneNumber, minLength: 10, maxLength: 20);

        if (validator.HasErrors) return validator.ToResult();

        var exists = await db.Users
            .AnyAsync(u => u.Email == payload.Email || u.Username == payload.Username, ct);
        if (exists)
            return ApiErrors.Conflict("Email or username already registered");

        var user = new User
        {
            Email = payload.Email!,
            Username = payload.Username!,
            FullName = payload.FullName!,
            DateOfBirth = payload.DateOfBirth!.Value,
            Address = payload.Address!,
            PhoneNumber = payload.PhoneNumber!,
            HashedPassword = Passwords.Hash(payload.Password!),   // never store plaintext
        };
        db.Users.Add(user);

        // Demo provisioning: funded account + random transaction history, standing in for
        // the account a branch would have opened in person. EF fixes up the FKs on save,
        // so the user, the account and its transactions all land in one transaction.
        await provisioner.ProvisionDemoAccountAsync(user, ct);
        await db.SaveChangesAsync(ct);

        return Results.Json(UserResponse.From(user), statusCode: StatusCodes.Status201Created);
    }

    /// <summary>Verify credentials and return a signed JWT access token.</summary>
    private static async Task<IResult> LoginAsync(
        LoginRequest payload,
        BankDbContext db,
        TokenService tokens,
        CancellationToken ct)
    {
        var validator = new FieldValidator()
            .Email("email", payload.Email)
            .String("password", payload.Password, minLength: 12, maxLength: 128);

        if (validator.HasErrors) return validator.ToResult();

        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == payload.Email, ct);

        // Same error whether the email is unknown or the password is wrong
        // (avoids user enumeration).
        if (user is null || !Passwords.Verify(payload.Password!, user.HashedPassword))
            return ApiErrors.Unauthorized("Invalid credentials");

        if (!user.IsActive)
            return ApiErrors.Forbidden("Account is inactive");

        return Results.Ok(new TokenResponse(tokens.CreateAccessToken(user.Id)));
    }

    /// <summary>Return the currently authenticated user (protected route).</summary>
    private static async Task<IResult> ReadMeAsync(
        ClaimsPrincipal principal,
        BankDbContext db,
        CancellationToken ct)
    {
        var user = await CurrentUser.ResolveAsync(principal, db, ct);
        return user is null
            ? ApiErrors.Unauthorized()
            : Results.Ok(UserResponse.From(user));
    }
}
