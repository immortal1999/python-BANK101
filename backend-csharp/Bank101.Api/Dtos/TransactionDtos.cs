namespace Bank101.Api.Dtos;

/// <summary>Port of TransactionCreate (transanction_schema.py).</summary>
public record TransactionCreate(
    int AccountId,
    string? TransactionType,   // deposit, withdrawal, transfer, payment, refund, fee, interest
    decimal Amount);

/// <summary>
/// Port of TransactionResponse (transaction_schema.py) — the joined shape returned by
/// GET /accounts/transactions, which carries the account_number alongside the row.
/// </summary>
public record TransactionResponse(
    int Id,
    int AccountId,
    string AccountNumber,      // masked/display handle for the account
    string TransactionType,
    decimal Amount,
    string Status,
    string? Description,
    DateTime CreatedAt);
