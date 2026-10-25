namespace Bank101.Api.Models;

public class Invoice
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public decimal Amount { get; set; }
    public string Status { get; set; } = null!;   // paid, unpaid, overdue
    public DateOnly DueDate { get; set; }
    public string? Description { get; set; }
    public DateTime? PaidAt { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public User User { get; set; } = null!;
}
