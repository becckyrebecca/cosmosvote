# Token Contract API Reference

Full reference for every public function in the CosmosVote token contract (SEP-41 compatible).

---

## `initialize`

```rust
pub fn initialize(
    env: Env,
    admin: Address,
    initial_supply: i128,
    name: String,
    symbol: String,
    decimals: u32,
) -> Result<(), ContractError>
```

**Parameters**

| Name | Type | Description |
|------|------|-------------|
| `admin` | `Address` | Receives initial supply and admin privileges |
| `initial_supply` | `i128` | Total tokens minted to admin at initialization |
| `name` | `String` | Human-readable token name (e.g., `"CosmosVote Token"`) |
| `symbol` | `String` | Ticker symbol (e.g., `"VOTE"`) |
| `decimals` | `u32` | Decimal places (typically `7` for Stellar) |

**Returns:** `Ok(())` on success.

**Errors:** `AlreadyInitialized (1)` if called more than once.

**Example**

```rust
token.initialize(
    &admin,
    &1_000_000_000i128,
    &String::from_str(&env, "CosmosVote Token"),
    &String::from_str(&env, "VOTE"),
    &7u32,
);
```

---

## `total_supply`

```rust
pub fn total_supply(env: Env) -> i128
```

**Returns:** Current total token supply (increases on mint, decreases on burn).

---

## `balance`

```rust
pub fn balance(env: Env, owner: Address) -> i128
```

**Returns:** Token balance of `owner`. Returns `0` for addresses with no balance.

---

## `balance_of`

```rust
pub fn balance_of(env: Env, owner: Address) -> i128
```

Alias for `balance`. Provided for SEP-41 compatibility.

---

## `allowance`

```rust
pub fn allowance(env: Env, owner: Address, spender: Address) -> i128
```

**Returns:** Amount `spender` is approved to transfer on behalf of `owner`.

---

## `name`

```rust
pub fn name(env: Env) -> String
```

**Returns:** Token name (SEP-41).

---

## `symbol`

```rust
pub fn symbol(env: Env) -> String
```

**Returns:** Token symbol (SEP-41).

---

## `decimals`

```rust
pub fn decimals(env: Env) -> u32
```

**Returns:** Number of decimal places (SEP-41).

---

## `admin`

```rust
pub fn admin(env: Env) -> Address
```

**Returns:** Current admin address.

---

## `version`

```rust
pub fn version(env: Env) -> (u32, u32, u32)
```

**Returns:** Contract version as `(major, minor, patch)`.

---

## `transfer`

```rust
pub fn transfer(
    env: Env,
    from: Address,
    to: Address,
    amount: i128,
) -> Result<(), ContractError>
```

Transfers `amount` tokens from `from` to `to`. `from` must authorize.

**Parameters**

| Name | Type | Description |
|------|------|-------------|
| `from` | `Address` | Must auth; sender |
| `to` | `Address` | Recipient |
| `amount` | `i128` | Must be > 0 |

**Errors**

| Code | Error | Condition |
|------|-------|-----------|
| 3 | `InsufficientBalance` | `from` balance < `amount` |
| 4 | `InvalidAmount` | `amount` ≤ 0 |

**Example**

```rust
token.transfer(&sender, &recipient, &1_000_000i128);
```

---

## `transfer_from`

```rust
pub fn transfer_from(
    env: Env,
    spender: Address,
    from: Address,
    to: Address,
    amount: i128,
) -> Result<(), ContractError>
```

Transfers tokens on behalf of `from` using a pre-approved allowance. `spender` must authorize.

**Errors**

| Code | Error | Condition |
|------|-------|-----------|
| 3 | `InsufficientBalance` | `from` balance < `amount` |
| 4 | `InvalidAmount` | `amount` ≤ 0 |
| 5 | `AllowanceExceeded` | Allowance < `amount` |

---

## `approve`

```rust
pub fn approve(
    env: Env,
    owner: Address,
    spender: Address,
    amount: i128,
) -> Result<(), ContractError>
```

Approves `spender` to transfer up to `amount` tokens from `owner`. `owner` must authorize.

Setting `amount` to `0` revokes the allowance.

**Errors:** `InvalidAmount (4)` if `amount < 0`.

**Example**

```rust
token.approve(&owner, &spender, &500_000i128);
```

---

## `mint`

```rust
pub fn mint(
    env: Env,
    admin: Address,
    to: Address,
    amount: i128,
) -> Result<(), ContractError>
```

Mints `amount` new tokens to `to`. Admin only.

**Errors**

| Code | Error | Condition |
|------|-------|-----------|
| 2 | `NotAdmin` | Caller is not admin |
| 4 | `InvalidAmount` | `amount` ≤ 0 |

**Example**

```rust
token.mint(&admin, &recipient, &10_000_000i128);
```

---

## `burn`

```rust
pub fn burn(
    env: Env,
    admin: Address,
    from: Address,
    amount: i128,
) -> Result<(), ContractError>
```

Burns `amount` tokens from `from`. Admin only.

**Errors**

| Code | Error | Condition |
|------|-------|-----------|
| 2 | `NotAdmin` | Caller is not admin |
| 3 | `InsufficientBalance` | `from` balance < `amount` |
| 4 | `InvalidAmount` | `amount` ≤ 0 |

---

## `burn_self`

```rust
pub fn burn_self(
    env: Env,
    owner: Address,
    amount: i128,
) -> Result<(), ContractError>
```

Burns `amount` of the caller's own tokens. `owner` must authorize.

**Errors**

| Code | Error | Condition |
|------|-------|-----------|
| 3 | `InsufficientBalance` | `owner` balance < `amount` |
| 4 | `InvalidAmount` | `amount` ≤ 0 |

---

## `transfer_admin`

```rust
pub fn transfer_admin(
    env: Env,
    admin: Address,
    new_admin: Address,
) -> Result<(), ContractError>
```

Transfers admin privileges immediately to `new_admin`. Admin only.

> Note: Unlike the governance contract, this is a single-step transfer.

**Errors:** `NotAdmin (2)` if caller is not admin.

---

## Error Code Reference

| Code | Name | Description |
|------|------|-------------|
| 1 | `AlreadyInitialized` | Contract already initialized |
| 2 | `NotAdmin` | Caller is not admin |
| 3 | `InsufficientBalance` | Balance too low for operation |
| 4 | `InvalidAmount` | Amount is zero or negative |
| 5 | `AllowanceExceeded` | Transfer exceeds approved allowance |
