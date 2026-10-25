using System.Security.Cryptography;
using Bank101.Api.Data;
using Bank101.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Bank101.Api.Core;

/// <summary>
/// Demo provisioning: give a user a funded checking account with a realistic-looking
/// transaction history. Stands in for the account a branch would have opened in person.
/// Port of app/core/provisioning.py.
/// </summary>
public class DemoProvisioner(BankDbContext db)
{
    // Made-up merchant history so the dashboard looks alive.
    private static readonly string[] Merchants =
    [
        "Amazon", "eBay", "Walmart", "Target", "Google", "Netflix", "Apple",
        "Starbucks", "Uber", "Costco", "Best Buy", "Spotify", "Whole Foods", "DoorDash",
    ];

    /// <summary>
    /// Create a funded checking account + random transaction history for a user.
    /// The final balance is derived from the transactions (deposit minus spending), so
    /// the balance and the history always agree. Caller is responsible for saving.
    ///
    /// Takes the User entity rather than an id so a brand-new, not-yet-saved user can
    /// be provisioned: EF fills in the FKs during save, letting the user, the account
    /// and its transactions all commit in a single transaction (what the Python does
    /// with flush-then-commit).
    /// </summary>
    public async Task<Account> ProvisionDemoAccountAsync(User user, CancellationToken ct = default)
    {
        var rng = Random.Shared;
        decimal depositAmount = rng.Next(20_000, 80_001);   // random whole-dollar deposit

        var account = new Account
        {
            User = user,
            AccountNumber = await UniqueAccountNumberAsync(ct),
            AccountType = "checking",
            Balance = depositAmount,   // adjusted below once spending is known
            Status = "active",
        };
        db.Accounts.Add(account);

        var now = BankDbContext.UtcNowNaive();
        var transactions = new List<Transaction>
        {
            new()
            {
                Account = account,   // FK filled in on save; no premature flush needed
                TransactionType = "deposit",
                Amount = depositAmount,
                Status = "completed",
                Description = $"Direct deposit — {Merchants[rng.Next(Merchants.Length)]}",
                CreatedAt = now.AddDays(-90),   // oldest entry
            },
        };

        decimal totalSpent = 0m;
        var purchaseCount = rng.Next(6, 13);
        for (var i = 0; i < purchaseCount; i++)
        {
            var amount = rng.Next(5, 1501) + rng.Next(0, 100) / 100m;
            totalSpent += amount;
            transactions.Add(new Transaction
            {
                Account = account,
                TransactionType = "purchase",
                Amount = amount,
                Status = "completed",
                Description = Merchants[rng.Next(Merchants.Length)],
                CreatedAt = now.AddDays(-rng.Next(1, 90)),
            });
        }

        account.Balance = depositAmount - totalSpent;   // keep balance consistent with history
        db.Transactions.AddRange(transactions);
        return account;
    }

    private async Task<string> UniqueAccountNumberAsync(CancellationToken ct)
    {
        while (true)
        {
            var number = RandomAccountNumber();
            if (!await db.Accounts.AnyAsync(a => a.AccountNumber == number, ct))
                return number;
        }
    }

    /// <summary>
    /// A cryptographically random 10-digit number, zero-padded — the equivalent of
    /// Python's secrets.randbelow(10**10). Built from two halves because
    /// RandomNumberGenerator.GetInt32 tops out at Int32.MaxValue, which is below 10^10.
    /// </summary>
    public static string RandomAccountNumber()
    {
        long value = (long)RandomNumberGenerator.GetInt32(0, 100_000) * 100_000
                     + RandomNumberGenerator.GetInt32(0, 100_000);
        return value.ToString("D10");
    }
}
