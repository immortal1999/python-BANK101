namespace Bank101.Api.Models;

public class AuditLog
{
    public int Id { get; set; }
    public int UserId { get; set; }
    public string Action { get; set; } = null!;
    public string EntityType { get; set; } = null!;   // account, transaction, payment, invoice
    public int EntityId { get; set; }
    public string Source { get; set; } = null!;       // web, mobile, api

    public string? UserAgent { get; set; }
    public string? Details { get; set; }
    public DateTime CreatedAt { get; set; }

    public User User { get; set; } = null!;
}
