using Bank101.Api.Models;

namespace Bank101.Api.Dtos;

// User DTOs for request and response validation.
// Must comply with KYC (Know Your Customer), AML (Anti-Money Laundering),
// and data-privacy standards.

/// <summary>Port of UserCreate (user_schema.py).</summary>
public record UserCreate(
    string? Email,
    string? Username,
    string? Password,
    string? FullName,
    DateOnly? DateOfBirth,
    string? Address,
    string? PhoneNumber);

/// <summary>Port of UserUpdate.</summary>
public record UserUpdate(
    string? Email,
    string? Password,
    string? FullName,
    DateOnly? DateOfBirth,
    string? Address,
    string? PhoneNumber);

/// <summary>
/// Port of UserResponse. Note what is absent: hashed_password is never serialized,
/// matching the Python schema's allow-list of fields.
/// </summary>
public record UserResponse(
    int Id,
    string Email,
    string Username,
    string FullName,
    DateOnly DateOfBirth,
    string Address,
    string PhoneNumber,
    string Role,
    bool IsActive,
    string KycStatus,
    string AmlStatus,
    string RiskLevel,
    DateTime? KycVerifiedAt,
    string? KycProvider)
{
    public static UserResponse From(User u) => new(
        u.Id, u.Email, u.Username, u.FullName, u.DateOfBirth, u.Address, u.PhoneNumber,
        u.Role, u.IsActive, u.KycStatus, u.AmlStatus, u.RiskLevel, u.KycVerifiedAt, u.KycProvider);
}
