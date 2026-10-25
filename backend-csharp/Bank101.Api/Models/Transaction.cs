namespace Bank101.Api.Models;

// Maps the same "transactions" table as the Python model, which is spelled
// `Transanction` there. The table name is what matters on the wire; the typo
// is not carried over.
public class Transaction
{
    public int Id { get; set; }
    public int AccountId { get; set; }
    public string TransactionType { get; set; } = null!;   // deposit, purchase, transfer, ...
    public decimal Amount { get; set; }
    public string Status { get; set; } = null!;
    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public Account Account { get; set; } = null!;
}
