namespace Bank101.Api.Core.Security;

/// <summary>
/// Mirrors the auth-related fields of the Python Settings class. Bound from
/// configuration, so the same JWT_SECRET_KEY / ALGORITHM / ACCESS_TOKEN_EXPIRE_MINUTES
/// environment variables the Python container already reads keep working.
/// </summary>
public class JwtSettings
{
    public string JwtSecretKey { get; set; } = "CHANGE_ME_IN_PRODUCTION";
    public string Algorithm { get; set; } = "HS256";
    public int AccessTokenExpireMinutes { get; set; } = 30;
}
