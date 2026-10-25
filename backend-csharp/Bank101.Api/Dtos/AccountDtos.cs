using Bank101.Api.Models;

namespace Bank101.Api.Dtos;

/// <summary>Port of AccountCreate. account_type: checking, savings, credit, business.</summary>
public record AccountCreate(string? AccountType);

public record AccountUpdate(string? Status);

/// <summary>Port of AccountResponse.</summary>
public record AccountResponse(
    int Id,
    int UserId,
    string AccountNumber,
    string AccountType,
    decimal Balance,
    string Status,
    DateTime CreatedAt,
    DateTime UpdatedAt)
{
    public static AccountResponse From(Account a) =>
        new(a.Id, a.UserId, a.AccountNumber, a.AccountType, a.Balance, a.Status, a.CreatedAt, a.UpdatedAt);
}

/// <summary>
/// Aggregate view of a user's accounts, computed server-side as exact decimals.
/// total_assets and the by_type values serialize as strings (e.g. "1500.00").
/// </summary>
public record AccountSummary(
    decimal TotalAssets,
    int AccountCount,
    Dictionary<string, decimal> ByType);
