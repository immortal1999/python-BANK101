namespace Bank101.Api.Dtos;

/// <summary>Port of LoginRequest (auth_schema.py).</summary>
public record LoginRequest(string? Email, string? Password);

/// <summary>
/// Port of TokenResponse. refresh_token is always null for now, exactly as in the
/// Python schema — the field is on the wire so clients can be written against it.
/// </summary>
public record TokenResponse(string AccessToken)
{
    public string TokenType { get; init; } = "bearer";
    public string? RefreshToken { get; init; }   // TODO: implement refresh tokens
}

public record RefreshTokenRequest(string RefreshToken);
