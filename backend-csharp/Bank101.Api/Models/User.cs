namespace Bank101.Api.Models;

public class User
{
    public int Id { get; set; }

    public string Email { get; set; } = null!;
    public string Username { get; set; } = null!;
    public string FullName { get; set; } = null!;
    public DateOnly DateOfBirth { get; set; }
    public string Address { get; set; } = null!;
    public string PhoneNumber { get; set; } = null!;

    public string HashedPassword { get; set; } = null!;

    public string Role { get; set; } = "customer";
    public bool IsActive { get; set; } = true;

    public string KycStatus { get; set; } = "pending";
    public string AmlStatus { get; set; } = "review_required";
    public string RiskLevel { get; set; } = "medium";
    public DateTime? KycVerifiedAt { get; set; }
    public string? KycProvider { get; set; }

    public DateTime CreatedAt { get; set; }
    public DateTime UpdatedAt { get; set; }

    public ICollection<Account> Accounts { get; set; } = new List<Account>();
}
