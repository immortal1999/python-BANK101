using System.Security.Claims;
using Bank101.Api.Core;
using Bank101.Api.Data;
using Bank101.Api.Dtos;
using Bank101.Api.Models;
using Microsoft.EntityFrameworkCore;

namespace Bank101.Api.Endpoints;

public static class AccountEndpoints
{
    public static void MapAccountEndpoints(this IEndpointRouteBuilder app)
    {
        var group = app.MapGroup("/accounts").WithTags("accounts").RequireAuthorization();

        group.MapPost("", CreateAccountAsync);
        group.MapGet("", ListAccountsAsync);

        // ASP.NET routing scores literal segments above parameterised ones, so these two
        // win over /{account_id} regardless of declaration order — unlike FastAPI, where
        // the source order in accounts.py is what keeps them reachable.
        group.MapGet("/summary", AccountSummaryAsync);
        group.MapGet("/transactions", ListTransactionsAsync);

        group.MapGet("/{account_id:int}", GetAccountAsync);
    }

    /// <summary>Create a new bank account for the authenticated user.</summary>
    private static async Task<IResult> CreateAccountAsync(
        AccountCreate payload,
        ClaimsPrincipal principal,
        BankDbContext db,
        CancellationToken ct)
    {
        var validator = new FieldValidator().String("account_type", payload.AccountType);
        if (validator.HasErrors) return validator.ToResult();

        var user = await CurrentUser.ResolveAsync(principal, db, ct);
        if (user is null) return ApiErrors.Unauthorized();

        // Generate a unique account number (10-digit random number).
        var accountNumber = DemoProvisioner.RandomAccountNumber();
        while (await db.Accounts.AnyAsync(a => a.AccountNumber == accountNumber, ct))
            accountNumber = DemoProvisioner.RandomAccountNumber();

        var account = new Account
        {
            UserId = user.Id,
            AccountNumber = accountNumber,
            AccountType = payload.AccountType!,
        };
        db.Accounts.Add(account);
        await db.SaveChangesAsync(ct);

        return Results.Json(AccountResponse.From(account), statusCode: StatusCodes.Status201Created);
    }

    /// <summary>List all bank accounts for the authenticated user.</summary>
    private static async Task<IResult> ListAccountsAsync(
        ClaimsPrincipal principal,
        BankDbContext db,
        CancellationToken ct)
    {
        var user = await CurrentUser.ResolveAsync(principal, db, ct);
        if (user is null) return ApiErrors.Unauthorized();

        var accounts = await db.Accounts
            .Where(a => a.UserId == user.Id)
            .Select(a => AccountResponse.From(a))
            .ToListAsync(ct);

        return Results.Ok(accounts);
    }

    /// <summary>
    /// Aggregate the authenticated user's accounts. All money math happens here, in
    /// exact decimal, so the frontend never does float arithmetic on money.
    /// </summary>
    private static async Task<IResult> AccountSummaryAsync(
        ClaimsPrincipal principal,
        BankDbContext db,
        CancellationToken ct)
    {
        var user = await CurrentUser.ResolveAsync(principal, db, ct);
        if (user is null) return ApiErrors.Unauthorized();

        var accounts = await db.Accounts
            .Where(a => a.UserId == user.Id)
            .Select(a => new { a.AccountType, a.Balance })
            .ToListAsync(ct);

        var totalAssets = accounts.Aggregate(0m, (sum, a) => sum + a.Balance);

        var byType = new Dictionary<string, decimal>();
        foreach (var a in accounts)
            byType[a.AccountType] = byType.GetValueOrDefault(a.AccountType) + a.Balance;

        return Results.Ok(new AccountSummary(totalAssets, accounts.Count, byType));
    }

    /// <summary>Recent transactions across all of the authenticated user's accounts, newest first.</summary>
    private static async Task<IResult> ListTransactionsAsync(
        ClaimsPrincipal principal,
        BankDbContext db,
        CancellationToken ct,
        int limit = 10)
    {
        var user = await CurrentUser.ResolveAsync(principal, db, ct);
        if (user is null) return ApiErrors.Unauthorized();

        var rows = await db.Transactions
            .Join(db.Accounts, t => t.AccountId, a => a.Id, (t, a) => new { Txn = t, Account = a })
            .Where(x => x.Account.UserId == user.Id)
            .OrderByDescending(x => x.Txn.CreatedAt)
            .Take(limit)
            .Select(x => new TransactionResponse(
                x.Txn.Id,
                x.Txn.AccountId,
                x.Account.AccountNumber,
                x.Txn.TransactionType,
                x.Txn.Amount,
                x.Txn.Status,
                x.Txn.Description,
                x.Txn.CreatedAt))
            .ToListAsync(ct);

        return Results.Ok(rows);
    }

    private static async Task<IResult> GetAccountAsync(
        int account_id,
        ClaimsPrincipal principal,
        BankDbContext db,
        CancellationToken ct)
    {
        var user = await CurrentUser.ResolveAsync(principal, db, ct);
        if (user is null) return ApiErrors.Unauthorized();

        var account = await db.Accounts
            .FirstOrDefaultAsync(a => a.Id == account_id && a.UserId == user.Id, ct);

        return account is null
            ? ApiErrors.NotFound("Account not found")
            : Results.Ok(AccountResponse.From(account));
    }
}
