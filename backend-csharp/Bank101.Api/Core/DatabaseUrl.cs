using Npgsql;

namespace Bank101.Api.Core;

/// <summary>
/// Translates the SQLAlchemy-style DATABASE_URL the deployment already sets
/// (written into .env by fetch-secrets.sh) into an Npgsql connection string.
///
/// SQLAlchemy accepts "postgresql://user:pass@host:5432/bank" and driver-qualified
/// variants like "postgresql+psycopg2://..."; Npgsql expects semicolon-delimited
/// keywords instead, so the URL is parsed rather than passed through. This is what
/// lets the C# container read the exact same secret as the Python one.
/// </summary>
public static class DatabaseUrl
{
    public static bool IsPostgres(string url) =>
        url.StartsWith("postgres://", StringComparison.OrdinalIgnoreCase) ||
        url.StartsWith("postgresql", StringComparison.OrdinalIgnoreCase);

    public static string ToNpgsqlConnectionString(string url)
    {
        // Already a keyword/value connection string (e.g. "Host=...;Database=...").
        if (!url.Contains("://", StringComparison.Ordinal)) return url;

        // Strip the SQLAlchemy driver suffix: postgresql+psycopg2 -> postgresql
        var schemeEnd = url.IndexOf("://", StringComparison.Ordinal);
        var scheme = url[..schemeEnd];
        var plus = scheme.IndexOf('+');
        if (plus >= 0) url = string.Concat("postgresql", url.AsSpan(schemeEnd));

        var uri = new Uri(url);
        var builder = new NpgsqlConnectionStringBuilder
        {
            Host = uri.Host,
            Port = uri.IsDefaultPort || uri.Port <= 0 ? 5432 : uri.Port,
            Database = uri.AbsolutePath.TrimStart('/'),
        };

        var userInfo = uri.UserInfo.Split(':', 2);
        if (userInfo.Length > 0 && userInfo[0].Length > 0)
            builder.Username = Uri.UnescapeDataString(userInfo[0]);
        if (userInfo.Length > 1)
            builder.Password = Uri.UnescapeDataString(userInfo[1]);

        // Carry through query args SQLAlchemy URLs commonly set, e.g. ?sslmode=require
        var query = System.Web.HttpUtility.ParseQueryString(uri.Query);
        foreach (var key in query.AllKeys)
        {
            if (key is null) continue;
            var value = query[key];
            if (value is null) continue;

            if (key.Equals("sslmode", StringComparison.OrdinalIgnoreCase)
                && Enum.TryParse<SslMode>(value, ignoreCase: true, out var sslMode))
            {
                builder.SslMode = sslMode;
            }
        }

        return builder.ConnectionString;
    }
}
