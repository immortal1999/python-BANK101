namespace Bank101.Api.Core.Security;

/// <summary>
/// Password hashing, kept wire-compatible with the Python side.
///
/// The Python app hashes with passlib's bcrypt (CryptContext(schemes=["bcrypt"])),
/// producing standard "$2b$12$..." modular-crypt strings. BCrypt.Net-Next reads and
/// writes that exact format, so users registered by either backend can log in to both.
///
/// Deliberately NOT ASP.NET Identity's PasswordHasher: its format is a bespoke
/// base64 PBKDF2 blob, and swapping it in would lock out every existing account.
/// </summary>
public static class Passwords
{
    // passlib's default cost for bcrypt is 12; matching it keeps verification time
    // (and therefore the login latency profile) the same across both backends.
    private const int WorkFactor = 12;

    public static string Hash(string plainPassword) =>
        BCrypt.Net.BCrypt.HashPassword(plainPassword, WorkFactor);

    public static bool Verify(string plainPassword, string hashedPassword)
    {
        try
        {
            return BCrypt.Net.BCrypt.Verify(plainPassword, hashedPassword);
        }
        catch (BCrypt.Net.SaltParseException)
        {
            // Malformed/legacy hash in the row — treat as a failed login rather than a 500.
            return false;
        }
    }
}
