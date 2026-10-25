using System.Security.Claims;
using System.Text;
using Microsoft.Extensions.Options;
using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;

namespace Bank101.Api.Core.Security;

/// <summary>
/// Issues the same token the Python create_access_token() does: HS256 over a
/// {sub, iat, exp} payload signed with JWT_SECRET_KEY. Tokens issued by either
/// backend validate against the other, so a browser holding a token from the Python
/// API stays logged in after a cutover.
/// </summary>
public class TokenService(IOptions<JwtSettings> settings)
{
    private readonly JwtSettings _settings = settings.Value;

    public string CreateAccessToken(int subject, int? expiresMinutes = null)
    {
        var now = DateTime.UtcNow;
        var expires = now.AddMinutes(expiresMinutes ?? _settings.AccessTokenExpireMinutes);

        var handler = new JsonWebTokenHandler();
        return handler.CreateToken(new SecurityTokenDescriptor
        {
            // "sub" as a raw claim, matching python-jose. JsonWebTokenHandler writes
            // iat/exp/nbf as numeric dates automatically.
            Claims = new Dictionary<string, object> { ["sub"] = subject.ToString() },
            IssuedAt = now,
            NotBefore = now,
            Expires = expires,
            SigningCredentials = new SigningCredentials(SigningKey(_settings), MapAlgorithm(_settings.Algorithm)),
        });
    }

    public static SymmetricSecurityKey SigningKey(JwtSettings settings)
        => new(Encoding.UTF8.GetBytes(settings.JwtSecretKey));

    public static string MapAlgorithm(string algorithm) => algorithm.ToUpperInvariant() switch
    {
        "HS256" => SecurityAlgorithms.HmacSha256,
        "HS384" => SecurityAlgorithms.HmacSha384,
        "HS512" => SecurityAlgorithms.HmacSha512,
        _ => throw new InvalidOperationException(
            $"Unsupported JWT algorithm '{algorithm}'. Expected one of HS256, HS384, HS512."),
    };

    /// <summary>
    /// Reads the user id out of the validated principal. Inbound claim mapping is
    /// switched off in Program.cs, so the claim is still literally named "sub" here
    /// rather than the ClaimTypes.NameIdentifier URI .NET would otherwise rename it to.
    /// </summary>
    public static int? GetUserId(ClaimsPrincipal principal)
    {
        var sub = principal.FindFirstValue("sub")
                  ?? principal.FindFirstValue(ClaimTypes.NameIdentifier);
        return int.TryParse(sub, out var id) ? id : null;
    }
}
