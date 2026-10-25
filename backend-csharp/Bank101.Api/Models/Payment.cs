namespace Bank101.Api.Models;

public class Payment
{
    public int Id { get; set; }
    public int AccountId { get; set; }
    public int InvoiceId { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = null!;   // completed, pending, failed
    public string? Description { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public Account Account { get; set; } = null!;
    public Invoice Invoice { get; set; } = null!;
}
