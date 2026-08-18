Bridge.Database.AfterMigration("sky_phone", function()

local sessions = {}
local profile_locks = {}
local exchange_lock = false
local markets = {}
local market_order = {}

local function ensure_schema()
    local statements = {
        [[CREATE TABLE IF NOT EXISTS `sky_phone_crypto_profiles` (
            `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `owner_identifier` VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `account_id` BIGINT UNSIGNED NULL,
            `handle` VARCHAR(20) CHARACTER SET ascii COLLATE ascii_general_ci NOT NULL,
            `password_hash` VARCHAR(255) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `price_alerts` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
            `trade_confirmations` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1,
            `hide_balances` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0,
            `status` ENUM('active','frozen','closed') NOT NULL DEFAULT 'active',
            `failed_logins` TINYINT UNSIGNED NOT NULL DEFAULT 0,
            `locked_until` DATETIME NULL,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `uniq_sky_phone_crypto_owner` (`owner_identifier`),
            UNIQUE KEY `uniq_sky_phone_crypto_handle` (`handle`)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci]],
        [[CREATE TABLE IF NOT EXISTS `sky_phone_crypto_markets` (
            `id` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `asset_scale` BIGINT UNSIGNED NOT NULL,
            `price_scale` BIGINT UNSIGNED NOT NULL,
            `issued_supply` DECIMAL(36,0) UNSIGNED NOT NULL,
            `price` DECIMAL(36,0) UNSIGNED NOT NULL,
            `version` BIGINT UNSIGNED NOT NULL DEFAULT 1,
            `status` ENUM('active','halted','stale') NOT NULL DEFAULT 'active',
            `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`)
        ) ENGINE=InnoDB]],
        [[CREATE TABLE IF NOT EXISTS `sky_phone_crypto_market_ticks` (
            `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            `market_id` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `version` BIGINT UNSIGNED NOT NULL,
            `price` DECIMAL(36,0) UNSIGNED NOT NULL,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `uniq_sky_phone_crypto_tick` (`market_id`,`version`),
            KEY `idx_sky_phone_crypto_ticks` (`market_id`,`created_at`,`id`)
        ) ENGINE=InnoDB]],
        [[CREATE TABLE IF NOT EXISTS `sky_phone_crypto_balances` (
            `account_id` VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `asset_id` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `available` DECIMAL(36,0) UNSIGNED NOT NULL DEFAULT 0,
            `locked` DECIMAL(36,0) UNSIGNED NOT NULL DEFAULT 0,
            `version` BIGINT UNSIGNED NOT NULL DEFAULT 0,
            `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`account_id`,`asset_id`)
        ) ENGINE=InnoDB]],
        [[CREATE TABLE IF NOT EXISTS `sky_phone_crypto_operations` (
            `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `profile_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `type` ENUM('buy','sell','deposit','withdrawal') NOT NULL,
            `idempotency_key` VARCHAR(96) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `request_hash` CHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `status` ENUM('prepared','external_pending','external_applied','ledger_applied','completed','failed','compensation_pending','manual_review','cancelled') NOT NULL,
            `amount` DECIMAL(36,0) UNSIGNED NOT NULL DEFAULT 0,
            `market_id` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NULL,
            `detail` VARCHAR(255) NOT NULL DEFAULT '',
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `uniq_sky_phone_crypto_operation` (`profile_id`,`type`,`idempotency_key`),
            KEY `idx_sky_phone_crypto_activity` (`profile_id`,`created_at`,`id`)
        ) ENGINE=InnoDB]],
        [[CREATE TABLE IF NOT EXISTS `sky_phone_crypto_ledger_entries` (
            `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            `operation_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `account_id` VARCHAR(48) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `asset_id` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `delta` DECIMAL(36,0) NOT NULL,
            `balance_after` DECIMAL(36,0) NULL,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_sky_phone_crypto_ledger_operation` (`operation_id`,`id`),
            KEY `idx_sky_phone_crypto_ledger_account` (`account_id`,`created_at`,`id`)
        ) ENGINE=InnoDB]],
        [[CREATE TABLE IF NOT EXISTS `sky_phone_crypto_quotes` (
            `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `profile_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `market_id` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `side` ENUM('buy','sell') NOT NULL,
            `quantity` DECIMAL(36,0) UNSIGNED NOT NULL,
            `price` DECIMAL(36,0) UNSIGNED NOT NULL,
            `gross` DECIMAL(36,0) UNSIGNED NOT NULL,
            `fee` DECIMAL(36,0) UNSIGNED NOT NULL,
            `net` DECIMAL(36,0) UNSIGNED NOT NULL,
            `market_version` BIGINT UNSIGNED NOT NULL,
            `expires_at` DATETIME NOT NULL,
            `consumed_operation_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_sky_phone_crypto_quote_profile` (`profile_id`,`expires_at`)
        ) ENGINE=InnoDB]],
        [[CREATE TABLE IF NOT EXISTS `sky_phone_crypto_fills` (
            `id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `operation_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `quote_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `market_id` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `side` ENUM('buy','sell') NOT NULL,
            `quantity` DECIMAL(36,0) UNSIGNED NOT NULL,
            `price` DECIMAL(36,0) UNSIGNED NOT NULL,
            `gross` DECIMAL(36,0) UNSIGNED NOT NULL,
            `fee` DECIMAL(36,0) UNSIGNED NOT NULL,
            `net` DECIMAL(36,0) UNSIGNED NOT NULL,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            UNIQUE KEY `uniq_sky_phone_crypto_fill_quote` (`quote_id`)
        ) ENGINE=InnoDB]],
        [[CREATE TABLE IF NOT EXISTS `sky_phone_crypto_settlements` (
            `operation_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `owner_identifier` VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `framework_account` VARCHAR(32) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `amount` DECIMAL(36,0) UNSIGNED NOT NULL,
            `state` ENUM('prepared','external_pending','external_applied','ledger_applied','completed','failed','compensation_pending','manual_review','cancelled') NOT NULL,
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            `updated_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
            PRIMARY KEY (`operation_id`),
            KEY `idx_sky_phone_crypto_settlement_state` (`state`,`updated_at`)
        ) ENGINE=InnoDB]],
        [[CREATE TABLE IF NOT EXISTS `sky_phone_crypto_audit_events` (
            `id` BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
            `profile_id` CHAR(36) CHARACTER SET ascii COLLATE ascii_bin NULL,
            `owner_identifier` VARCHAR(80) CHARACTER SET ascii COLLATE ascii_bin NULL,
            `event_type` VARCHAR(64) CHARACTER SET ascii COLLATE ascii_bin NOT NULL,
            `detail` VARCHAR(255) NOT NULL DEFAULT '',
            `created_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (`id`),
            KEY `idx_sky_phone_crypto_audit` (`profile_id`,`created_at`,`id`)
        ) ENGINE=InnoDB]],
    }
    for _, statement in ipairs(statements) do
        Bridge.Database.Query(statement, {})
    end
    Bridge.Database.Query("ALTER TABLE `sky_phone_crypto_profiles` ADD COLUMN IF NOT EXISTS `price_alerts` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1 AFTER `password_hash`", {})
    Bridge.Database.Query("ALTER TABLE `sky_phone_crypto_profiles` ADD COLUMN IF NOT EXISTS `trade_confirmations` TINYINT(1) UNSIGNED NOT NULL DEFAULT 1 AFTER `price_alerts`", {})
    Bridge.Database.Query("ALTER TABLE `sky_phone_crypto_profiles` ADD COLUMN IF NOT EXISTS `hide_balances` TINYINT(1) UNSIGNED NOT NULL DEFAULT 0 AFTER `trade_confirmations`", {})
end

local function new_id()
    local row = Bridge.Database.Query("SELECT UUID() AS `id`", {})[1]
    if not row or type(row.id) ~= "string" then
        error("[sky_phone] Database did not generate a Crypto id.")
    end
    return row.id
end

local function affected_rows(result)
    if type(result) == "number" then
        return result
    end
    return type(result) == "table" and tonumber(result.affectedRows) or 0
end

local function account_id(profile_id)
    return "profile:" .. profile_id
end

local function valid_handle(value)
    if type(value) ~= "string" then
        return nil
    end
    local handle = value:match("^%s*(.-)%s*$")
    local length = utf8.len(handle)
    if not length or length < Config.Crypto.HandleMinLength or length > Config.Crypto.HandleMaxLength
        or not handle:match("^[A-Za-z0-9][A-Za-z0-9._]*[A-Za-z0-9]$")
    then
        return nil
    end
    return handle
end

local function valid_password(value)
    local length = type(value) == "string" and utf8.len(value) or nil
    return length and length >= Config.Crypto.PasswordMinLength
        and length <= Config.Crypto.PasswordMaxLength
end

local function parse_whole(value, minimum, maximum)
    if type(value) ~= "string" or not value:match("^%d+$") then
        return nil
    end
    local amount = tonumber(value)
    if not amount or amount ~= math.floor(amount) or amount < minimum or amount > maximum then
        return nil
    end
    return amount
end

local function parse_quantity(value)
    if type(value) ~= "string" then
        return nil
    end
    local whole, decimal = value:match("^(%d+)%.?(%d*)$")
    if not whole or #decimal > 6 then
        return nil
    end
    decimal = decimal .. string.rep("0", 6 - #decimal)
    local quantity = tonumber(whole) * Config.Crypto.AssetScale + tonumber(decimal)
    if quantity <= 0 or quantity > 1000000 * Config.Crypto.AssetScale then
        return nil
    end
    return quantity
end

local function decimal_string(value, scale)
    value = math.floor(tonumber(value) or 0)
    if scale == 1 then
        return tostring(value)
    end
    local digits = tostring(scale):len() - 1
    local whole = math.floor(value / scale)
    local fraction = tostring(value % scale)
    fraction = string.rep("0", digits - #fraction) .. fraction
    fraction = fraction:gsub("0+$", "")
    return fraction == "" and tostring(whole) or (tostring(whole) .. "." .. fraction)
end

local function ceil_div(value, divisor)
    return math.floor((value + divisor - 1) / divisor)
end

local function initialize_markets()
    for _, config in ipairs(Config.Crypto.Markets) do
        markets[config.Id] = config
        market_order[#market_order + 1] = config.Id
        Bridge.Database.Query([[
            INSERT INTO `sky_phone_crypto_markets`
                (`id`,`asset_scale`,`price_scale`,`issued_supply`,`price`,`version`,`status`)
            VALUES (?, ?, ?, ?, ?, 1, 'active') ON DUPLICATE KEY UPDATE `id` = VALUES(`id`)
        ]], {
            config.Id,
            Config.Crypto.AssetScale,
            Config.Crypto.PriceScale,
            config.IssuedSupply * Config.Crypto.AssetScale,
            config.InitialPrice,
        })
        local persisted = Bridge.Database.Query([[
            SELECT `asset_scale`,`price_scale`,`issued_supply`
            FROM `sky_phone_crypto_markets` WHERE `id` = ? LIMIT 1
        ]], { config.Id })[1]
        if not persisted
            or tonumber(persisted.asset_scale) ~= Config.Crypto.AssetScale
            or tonumber(persisted.price_scale) ~= Config.Crypto.PriceScale
            or tonumber(persisted.issued_supply) ~= config.IssuedSupply * Config.Crypto.AssetScale
        then
            error(("[sky_phone] Crypto market scale or supply changed without a migration: %s"):format(config.Id))
        end
        Bridge.Database.Query([[
            INSERT INTO `sky_phone_crypto_balances` (`account_id`,`asset_id`,`available`)
            VALUES ('treasury', ?, ?) ON DUPLICATE KEY UPDATE `account_id` = VALUES(`account_id`)
        ]], { config.Id, config.TreasuryInventory * Config.Crypto.AssetScale })
        Bridge.Database.Query([[
            INSERT INTO `sky_phone_crypto_balances` (`account_id`,`asset_id`,`available`)
            VALUES ('reserve', ?, ?) ON DUPLICATE KEY UPDATE `account_id` = VALUES(`account_id`)
        ]], {
            config.Id,
            (config.IssuedSupply - config.TreasuryInventory) * Config.Crypto.AssetScale,
        })
    end
    Bridge.Database.Query([[
        INSERT INTO `sky_phone_crypto_balances` (`account_id`,`asset_id`,`available`)
        VALUES ('treasury', 'CASH', ?) ON DUPLICATE KEY UPDATE `account_id` = VALUES(`account_id`)
    ]], { Config.Crypto.TreasuryCash * Config.Crypto.PriceScale })
end

local function require_phone(source)
    local phone_session, error_response = SkyPhone.RequireSession(source)
    if not phone_session then
        return nil, nil, error_response
    end
    local identifier = Bridge.Framework.GetIdentifier(source)
    if type(identifier) ~= "string" or identifier == "" then
        return nil, nil, { success = false, error = "service_unavailable" }
    end
    return phone_session, identifier
end

local function profile_by_owner(identifier)
    return Bridge.Database.Query([[
        SELECT `id`,`owner_identifier`,`account_id`,`handle`,`status`,`failed_logins`,
            `price_alerts`,`trade_confirmations`,`hide_balances`,
            UNIX_TIMESTAMP(`created_at`) AS `created_at`,
            UNIX_TIMESTAMP(`locked_until`) AS `locked_until`
        FROM `sky_phone_crypto_profiles` WHERE `owner_identifier` = ? LIMIT 1
    ]], { identifier })[1]
end

local function authenticated_profile(source)
    local phone_session, identifier, error_response = require_phone(source)
    if not phone_session then
        return nil, error_response
    end
    local session = sessions[source]
    if not session or session.identifier ~= identifier or session.imei ~= phone_session.imei
        or session.expires_at < os.time()
    then
        sessions[source] = nil
        return nil, { success = false, error = "not_authenticated" }
    end
    local profile = profile_by_owner(identifier)
    if not profile or profile.id ~= session.profile_id or profile.status ~= "active" then
        sessions[source] = nil
        return nil, { success = false, error = "not_authenticated" }
    end
    session.expires_at = os.time() + Config.Crypto.SessionSeconds
    return profile
end

local function verify_password(profile_id, password)
    if not valid_password(password) then
        return false
    end
    local row = Bridge.Database.Query(
        "SELECT `password_hash` FROM `sky_phone_crypto_profiles` WHERE `id` = ? LIMIT 1",
        { profile_id }
    )[1]
    return row and exports[GetCurrentResourceName()]:CryptoVerifyPassword(password, row.password_hash) or false
end

local function set_session(source, phone_session, profile, recently_authenticated)
    sessions[source] = {
        expires_at = os.time() + Config.Crypto.SessionSeconds,
        identifier = profile.owner_identifier,
        imei = phone_session.imei,
        profile_id = profile.id,
        recently_authenticated_at = recently_authenticated and os.time() or 0,
    }
end

local function balance(account, asset)
    local row = Bridge.Database.Query([[
        SELECT `available`,`locked`,`version` FROM `sky_phone_crypto_balances`
        WHERE `account_id` = ? AND `asset_id` = ? LIMIT 1
    ]], { account, asset })[1]
    return row and (tonumber(row.available) or 0) or 0,
        row and (tonumber(row.locked) or 0) or 0,
        row and (tonumber(row.version) or 0) or 0
end

local function market_rows()
    local rows = Bridge.Database.Query([[
        SELECT `id`,`price`,`version`,`status`, UNIX_TIMESTAMP(`updated_at`) AS `updated_at`
        FROM `sky_phone_crypto_markets`
    ]], {})
    local indexed = {}
    for _, row in ipairs(rows) do
        indexed[row.id] = row
    end
    return indexed
end

local function market_dtos()
    local current = market_rows()
    local result = {}
    for _, market_id in ipairs(market_order) do
        local config = markets[market_id]
        local row = current[market_id]
        local ticks = Bridge.Database.Query([[
            SELECT `price` FROM `sky_phone_crypto_market_ticks`
            WHERE `market_id` = ? ORDER BY `id` DESC LIMIT 12
        ]], { market_id })
        local prices = {}
        for index = #ticks, 1, -1 do
            prices[#prices + 1] = tonumber(ticks[index].price) or tonumber(row.price)
        end
        if #prices == 0 then
            prices[1] = tonumber(row.price)
        end
        local minimum = math.min(table.unpack(prices))
        local maximum = math.max(table.unpack(prices))
        local span = math.max(1, maximum - minimum)
        local sparkline = {}
        for index, price in ipairs(prices) do
            sparkline[index] = (price - minimum) / span
        end
        local first = prices[1]
        local price = tonumber(row.price) or config.InitialPrice
        result[#result + 1] = {
            id = market_id,
            symbol = config.Symbol,
            name = config.Name,
            color = config.Color,
            logo = config.Logo,
            price = decimal_string(price, Config.Crypto.PriceScale),
            changePercent = first > 0 and ((price - first) / first) * 100 or 0,
            enabled = row.status == "active",
            high24h = decimal_string(math.max(table.unpack(prices)), Config.Crypto.PriceScale),
            low24h = decimal_string(math.min(table.unpack(prices)), Config.Crypto.PriceScale),
            issuedSupply = decimal_string(config.IssuedSupply * Config.Crypto.AssetScale, Config.Crypto.AssetScale),
            treasuryAvailable = decimal_string(balance("treasury", market_id), Config.Crypto.AssetScale),
            sparkline = sparkline,
        }
    end
    return result
end

local function activity(profile_id)
    local rows = Bridge.Database.Query([[
        SELECT `id`,`type`,`amount`,`market_id`,`status`, UNIX_TIMESTAMP(`created_at`) AS `created_at`
        FROM `sky_phone_crypto_operations` WHERE `profile_id` = ?
        ORDER BY `created_at` DESC, `id` DESC LIMIT 50
    ]], { profile_id })
    local result = {}
    for _, row in ipairs(rows) do
        result[#result + 1] = {
            id = row.id,
            type = row.type,
            amount = decimal_string(row.amount, Config.Crypto.PriceScale),
            marketId = row.market_id,
            status = row.status,
            createdAt = (tonumber(row.created_at) or 0) * 1000,
        }
    end
    return result
end

local function daily_total(profile_id, operation_type)
    local row = Bridge.Database.Query([[
        SELECT COALESCE(SUM(`amount`), 0) AS `total`
        FROM `sky_phone_crypto_operations`
        WHERE `profile_id` = ? AND `type` = ? AND `status` = 'completed'
            AND `created_at` >= CURRENT_DATE
    ]], { profile_id, operation_type })[1]
    return tonumber(row and row.total) or 0
end

local function bootstrap(profile)
    local cash = balance(account_id(profile.id), "CASH")
    local current_markets = market_rows()
    local holdings = {}
    local portfolio = cash
    for _, market_id in ipairs(market_order) do
        local available = balance(account_id(profile.id), market_id)
        if available > 0 then
            local price = tonumber(current_markets[market_id].price) or 0
            local value = math.floor(available * price / Config.Crypto.AssetScale)
            local fill = Bridge.Database.Query([[
                SELECT FLOOR(SUM(fill.`gross`) * ? / NULLIF(SUM(fill.`quantity`), 0)) AS `price`
                FROM `sky_phone_crypto_fills` fill
                JOIN `sky_phone_crypto_operations` operation ON operation.`id` = fill.`operation_id`
                WHERE operation.`profile_id` = ? AND fill.`market_id` = ? AND fill.`side` = 'buy'
            ]], { Config.Crypto.AssetScale, profile.id, market_id })[1]
            holdings[#holdings + 1] = {
                assetId = market_id,
                quantity = decimal_string(available, Config.Crypto.AssetScale),
                value = decimal_string(value, Config.Crypto.PriceScale),
                averagePrice = decimal_string(fill and fill.price or price, Config.Crypto.PriceScale),
            }
            portfolio = portfolio + value
        end
    end
    local metrics = Bridge.Database.Query([[
        SELECT COUNT(*) AS `total_trades`, COALESCE(SUM(`amount`), 0) AS `total_volume`
        FROM `sky_phone_crypto_operations`
        WHERE `profile_id` = ? AND `type` IN ('buy','sell') AND `status` = 'completed'
    ]], { profile.id })[1]
    return {
        authenticated = true,
        profile = {
            id = profile.id,
            handle = profile.handle,
            status = profile.status,
            createdAt = (tonumber(profile.created_at) or 0) * 1000,
            hideBalances = tonumber(profile.hide_balances) == 1,
            priceAlerts = tonumber(profile.price_alerts) == 1,
            tradeConfirmations = tonumber(profile.trade_confirmations) == 1,
            totalTrades = tonumber(metrics and metrics.total_trades) or 0,
            totalVolume = decimal_string(metrics and metrics.total_volume, Config.Crypto.PriceScale),
        },
        cashBalance = decimal_string(cash, Config.Crypto.PriceScale),
        portfolioValue = decimal_string(portfolio, Config.Crypto.PriceScale),
        holdings = holdings,
        markets = market_dtos(),
        activity = activity(profile.id),
    }
end

local function audit(profile_id, identifier, event_type, detail)
    Bridge.Database.Query([[
        INSERT INTO `sky_phone_crypto_audit_events`
            (`profile_id`,`owner_identifier`,`event_type`,`detail`) VALUES (?, ?, ?, ?)
    ]], { profile_id, identifier, event_type, detail or "" })
end

local function idempotency_key(value)
    if type(value) ~= "string" or #value < 8 or #value > 96
        or not value:match("^[A-Za-z0-9._-]+$")
    then
        return nil
    end
    return value
end

local function with_profile_lock(profile_id, callback)
    if profile_locks[profile_id] then
        return { success = false, error = "rate_limited" }
    end
    profile_locks[profile_id] = true
    local success, result = pcall(callback)
    profile_locks[profile_id] = nil
    if not success then
        error(result)
    end
    return result
end

local function with_exchange_lock(callback)
    if exchange_lock then
        return { success = false, error = "rate_limited" }
    end
    exchange_lock = true
    local success, result = pcall(callback)
    exchange_lock = false
    if not success then
        error(result)
    end
    return result
end

Bridge.Callbacks.Register("sky_phone:crypto:bootstrap", function(source)
    if not Config.Crypto.Enabled then
        return { success = false, error = "service_unavailable" }
    end
    local profile, error_response = authenticated_profile(source)
    if profile then
        return { success = true, data = bootstrap(profile) }
    end
    local _, identifier, phone_error = require_phone(source)
    if not identifier then
        return phone_error
    end
    local existing = profile_by_owner(identifier)
    return {
        success = true,
        data = {
            authenticated = false,
            profile = nil,
            cashBalance = "0",
            portfolioValue = "0",
            holdings = {},
            markets = market_dtos(),
            activity = {},
            registered = existing ~= nil,
        },
    }
end)

Bridge.Callbacks.Register("sky_phone:crypto:register", function(source, data)
    if not SkyPhone.AllowOperation(source, "crypto:register", 5, 60) then
        return { success = false, error = "rate_limited" }
    end
    local phone_session, identifier, error_response = require_phone(source)
    if not phone_session then
        return error_response
    end
    local account, account_error = SkyPhone.RequireAccount(source)
    if not account then
        return account_error
    end
    data = type(data) == "table" and data or {}
    local handle = valid_handle(data.handle)
    if not handle then
        return { success = false, error = "invalid_handle" }
    end
    if not valid_password(data.password) then
        return { success = false, error = "invalid_password" }
    end
    if profile_by_owner(identifier) then
        return { success = false, error = "profile_exists" }
    end
    local duplicate = Bridge.Database.Query(
        "SELECT 1 FROM `sky_phone_crypto_profiles` WHERE `handle` = ? LIMIT 1",
        { handle }
    )
    if duplicate[1] then
        return { success = false, error = "handle_taken" }
    end
    local entropy = Bridge.Database.Query("SELECT UUID() AS `id`", {})[1]
    local password_hash = exports[GetCurrentResourceName()]:CryptoHashPassword(data.password)
    if type(password_hash) ~= "string" then
        error("[sky_phone] Crypto password provider did not return a password hash.")
    end
    local queries = {
        {
            query = [[INSERT INTO `sky_phone_crypto_profiles`
                (`id`,`owner_identifier`,`account_id`,`handle`,`password_hash`)
                VALUES (?, ?, ?, ?, ?)]],
            params = { entropy.id, identifier, account.id, handle, password_hash },
        },
        {
            query = [[INSERT INTO `sky_phone_crypto_balances`
                (`account_id`,`asset_id`,`available`) VALUES (?, 'CASH', 0)]],
            params = { account_id(entropy.id) },
        },
    }
    if not Bridge.Database.Transaction(queries) then
        return { success = false, error = "request_failed" }
    end
    local profile = profile_by_owner(identifier)
    set_session(source, phone_session, profile, true)
    audit(profile.id, identifier, "profile_registered", "")
    return { success = true, data = bootstrap(profile) }
end)

Bridge.Callbacks.Register("sky_phone:crypto:login", function(source, data)
    if not SkyPhone.AllowOperation(source, "crypto:login", 10, 60) then
        return { success = false, error = "rate_limited" }
    end
    local phone_session, identifier, error_response = require_phone(source)
    if not phone_session then
        return error_response
    end
    local profile = profile_by_owner(identifier)
    if not profile then
        return { success = false, error = "invalid_credentials" }
    end
    if tonumber(profile.locked_until) and tonumber(profile.locked_until) > os.time() then
        return { success = false, error = "locked" }
    end
    if not verify_password(profile.id, type(data) == "table" and data.password or nil) then
        local failed = (tonumber(profile.failed_logins) or 0) + 1
        local lock = failed >= Config.Crypto.LoginAttempts
        Bridge.Database.Query([[
            UPDATE `sky_phone_crypto_profiles` SET `failed_logins` = ?,
                `locked_until` = IF(?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? SECOND), NULL)
            WHERE `id` = ?
        ]], { lock and 0 or failed, lock and 1 or 0, Config.Crypto.LockoutSeconds, profile.id })
        audit(profile.id, identifier, "login_failed", lock and "profile_locked" or "invalid_password")
        return { success = false, error = lock and "locked" or "invalid_credentials" }
    end
    Bridge.Database.Query(
        "UPDATE `sky_phone_crypto_profiles` SET `failed_logins` = 0, `locked_until` = NULL WHERE `id` = ?",
        { profile.id }
    )
    set_session(source, phone_session, profile, true)
    audit(profile.id, identifier, "login_succeeded", phone_session.imei)
    return { success = true, data = bootstrap(profile) }
end)

Bridge.Callbacks.Register("sky_phone:crypto:logout", function(source)
    local session = sessions[source]
    if session then
        audit(session.profile_id, session.identifier, "logout", "")
    end
    sessions[source] = nil
    return { success = true }
end)

Bridge.Callbacks.Register("sky_phone:crypto:update-profile", function(source, data)
    if not SkyPhone.AllowOperation(source, "crypto:update-profile", 8, 60) then
        return { success = false, error = "rate_limited" }
    end
    local profile, error_response = authenticated_profile(source)
    if not profile then
        return error_response
    end
    data = type(data) == "table" and data or {}
    local handle = valid_handle(data.handle)
    if not handle or type(data.priceAlerts) ~= "boolean"
        or type(data.tradeConfirmations) ~= "boolean" or type(data.hideBalances) ~= "boolean"
    then
        return { success = false, error = "invalid_profile" }
    end
    local handle_changed = handle:lower() ~= profile.handle:lower()
    local new_password = type(data.newPassword) == "string" and data.newPassword or ""
    local password_changed = new_password ~= ""
    if password_changed and not valid_password(new_password) then
        return { success = false, error = "invalid_password" }
    end
    if handle_changed or password_changed then
        if not verify_password(profile.id, data.currentPassword) then
            audit(profile.id, profile.owner_identifier, "profile_update_reauth_failed", "")
            return { success = false, error = "invalid_credentials" }
        end
        sessions[source].recently_authenticated_at = os.time()
    end
    if handle_changed then
        local duplicate = Bridge.Database.Query(
            "SELECT 1 FROM `sky_phone_crypto_profiles` WHERE `handle` = ? AND `id` <> ? LIMIT 1",
            { handle, profile.id }
        )
        if duplicate[1] then
            return { success = false, error = "handle_taken" }
        end
    end
    if password_changed then
        local password_hash = exports[GetCurrentResourceName()]:CryptoHashPassword(new_password)
        if type(password_hash) ~= "string" then
            return { success = false, error = "service_unavailable" }
        end
        Bridge.Database.Query([[
            UPDATE `sky_phone_crypto_profiles`
            SET `handle` = ?, `password_hash` = ?, `price_alerts` = ?,
                `trade_confirmations` = ?, `hide_balances` = ?
            WHERE `id` = ?
        ]], {
            handle,
            password_hash,
            data.priceAlerts and 1 or 0,
            data.tradeConfirmations and 1 or 0,
            data.hideBalances and 1 or 0,
            profile.id,
        })
    else
        Bridge.Database.Query([[
            UPDATE `sky_phone_crypto_profiles`
            SET `handle` = ?, `price_alerts` = ?, `trade_confirmations` = ?, `hide_balances` = ?
            WHERE `id` = ?
        ]], {
            handle,
            data.priceAlerts and 1 or 0,
            data.tradeConfirmations and 1 or 0,
            data.hideBalances and 1 or 0,
            profile.id,
        })
    end
    audit(
        profile.id,
        profile.owner_identifier,
        "profile_updated",
        (handle_changed and "handle" or "preferences") .. (password_changed and ",password" or "")
    )
    return { success = true, data = bootstrap(profile_by_owner(profile.owner_identifier)) }
end)

Bridge.Callbacks.Register("sky_phone:crypto:quote", function(source, data)
    if not SkyPhone.AllowOperation(source, "crypto:quote", Config.Crypto.ActionsPerMinute, 60) then
        return { success = false, error = "rate_limited" }
    end
    local profile, error_response = authenticated_profile(source)
    if not profile then
        return error_response
    end
    data = type(data) == "table" and data or {}
    local config = markets[data.marketId]
    local side = data.side == "buy" and "buy" or data.side == "sell" and "sell" or nil
    local quantity = parse_quantity(data.quantity)
    if not config or not side or not quantity then
        return { success = false, error = "invalid_quantity" }
    end
    local market = Bridge.Database.Query(
        "SELECT `price`,`version`,`status` FROM `sky_phone_crypto_markets` WHERE `id` = ? LIMIT 1",
        { config.Id }
    )[1]
    if not market or market.status ~= "active" then
        return { success = false, error = "market_unavailable" }
    end
    local spread_bps = 40
    local reference = tonumber(market.price)
    local price = side == "buy"
        and ceil_div(reference * (10000 + spread_bps), 10000)
        or math.floor(reference * (10000 - spread_bps) / 10000)
    local gross = side == "buy"
        and ceil_div(quantity * price, Config.Crypto.AssetScale)
        or math.floor(quantity * price / Config.Crypto.AssetScale)
    local fee = math.max(Config.Crypto.MinimumFee, ceil_div(gross * Config.Crypto.FeeBasisPoints, 10000))
    local net = side == "buy" and gross + fee or gross - fee
    if gross <= 0 or net <= 0 or gross > Config.Crypto.MaximumTradeNotional * Config.Crypto.PriceScale then
        return { success = false, error = "limit_exceeded" }
    end
    if side == "buy" then
        if balance(account_id(profile.id), config.Id) + quantity
            > Config.Crypto.MaximumPositionQuantity * Config.Crypto.AssetScale
        then
            return { success = false, error = "limit_exceeded" }
        end
        if balance(account_id(profile.id), "CASH") < net then
            return { success = false, error = "insufficient_funds" }
        end
        if balance("treasury", config.Id) < quantity then
            return { success = false, error = "insufficient_liquidity" }
        end
    else
        if balance(account_id(profile.id), config.Id) < quantity then
            return { success = false, error = "insufficient_funds" }
        end
        if balance("treasury", "CASH") < net then
            return { success = false, error = "insufficient_liquidity" }
        end
    end
    if daily_total(profile.id, side) + net > Config.Crypto.DailyTradeLimit * Config.Crypto.PriceScale then
        return { success = false, error = "limit_exceeded" }
    end
    local quote_id = new_id()
    Bridge.Database.Query([[
        INSERT INTO `sky_phone_crypto_quotes`
            (`id`,`profile_id`,`market_id`,`side`,`quantity`,`price`,`gross`,`fee`,`net`,`market_version`,`expires_at`)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, DATE_ADD(CURRENT_TIMESTAMP, INTERVAL ? SECOND))
    ]], {
        quote_id, profile.id, config.Id, side, quantity, price, gross, fee, net,
        market.version, Config.Crypto.QuoteLifetimeSeconds,
    })
    return {
        success = true,
        data = {
            id = quote_id,
            marketId = config.Id,
            side = side,
            quantity = decimal_string(quantity, Config.Crypto.AssetScale),
            price = decimal_string(price, Config.Crypto.PriceScale),
            gross = decimal_string(gross, Config.Crypto.PriceScale),
            fee = decimal_string(fee, Config.Crypto.PriceScale),
            net = decimal_string(net, Config.Crypto.PriceScale),
            expiresAt = (os.time() + Config.Crypto.QuoteLifetimeSeconds) * 1000,
        },
    }
end)

local function execute_trade(profile, data)
    local key = idempotency_key(data.idempotencyKey)
    if not key or type(data.quoteId) ~= "string" or #data.quoteId ~= 36 then
        return { success = false, error = "quote_unavailable" }
    end
    local existing = Bridge.Database.Query([[
        SELECT `status` FROM `sky_phone_crypto_operations`
        WHERE `profile_id` = ? AND `idempotency_key` = ? LIMIT 1
    ]], { profile.id, key })[1]
    if existing then
        return existing.status == "completed"
            and { success = true, data = bootstrap(profile) }
            or { success = false, error = "duplicate_request" }
    end
    local quote = Bridge.Database.Query([[
        SELECT quote.*, market.`status` AS `market_status`, market.`version` AS `current_version`
        FROM `sky_phone_crypto_quotes` quote
        JOIN `sky_phone_crypto_markets` market ON market.`id` = quote.`market_id`
        WHERE quote.`id` = ? AND quote.`profile_id` = ? LIMIT 1
    ]], { data.quoteId, profile.id })[1]
    if not quote or quote.consumed_operation_id then
        return { success = false, error = "quote_unavailable" }
    end
    local expiry = Bridge.Database.Query(
        "SELECT UNIX_TIMESTAMP(`expires_at`) AS `expires_at` FROM `sky_phone_crypto_quotes` WHERE `id` = ?",
        { quote.id }
    )[1]
    if not expiry or tonumber(expiry.expires_at) < os.time() then
        return { success = false, error = "quote_expired" }
    end
    if quote.market_status ~= "active" or tonumber(quote.current_version) ~= tonumber(quote.market_version) then
        return { success = false, error = "quote_expired" }
    end
    local quantity = tonumber(quote.quantity)
    local net_currency = tonumber(quote.net)
    local player_account = account_id(profile.id)
    if daily_total(profile.id, quote.side) + net_currency
        > Config.Crypto.DailyTradeLimit * Config.Crypto.PriceScale
    then
        return { success = false, error = "limit_exceeded" }
    end
    if quote.side == "buy" then
        if balance(player_account, quote.market_id) + quantity
            > Config.Crypto.MaximumPositionQuantity * Config.Crypto.AssetScale
        then
            return { success = false, error = "limit_exceeded" }
        end
        if balance(player_account, "CASH") < net_currency then
            return { success = false, error = "insufficient_funds" }
        end
        if balance("treasury", quote.market_id) < quantity then
            return { success = false, error = "insufficient_liquidity" }
        end
    else
        if balance(player_account, quote.market_id) < quantity then
            return { success = false, error = "insufficient_funds" }
        end
        if balance("treasury", "CASH") < net_currency then
            return { success = false, error = "insufficient_liquidity" }
        end
    end
    local operation_id = new_id()
    local fill_id = new_id()
    local operation_type = quote.side
    local request_hash = Bridge.Database.Query(
        "SELECT SHA2(CONCAT(?, ':', ?), 256) AS `hash`",
        { quote.id, key }
    )[1].hash
    local queries = {
        {
            query = [[INSERT INTO `sky_phone_crypto_operations`
                (`id`,`profile_id`,`type`,`idempotency_key`,`request_hash`,`status`,`amount`,`market_id`)
                VALUES (?, ?, ?, ?, ?, 'prepared', ?, ?)]],
            params = { operation_id, profile.id, operation_type, key, request_hash, net_currency, quote.market_id },
        },
    }
    if quote.side == "buy" then
        queries[#queries + 1] = { query = [[UPDATE `sky_phone_crypto_balances` SET `available` = `available` - ?, `version` = `version` + 1 WHERE `account_id` = ? AND `asset_id` = 'CASH' AND `available` >= ?]], params = { net_currency, player_account, net_currency } }
        queries[#queries + 1] = { query = [[UPDATE `sky_phone_crypto_balances` SET `available` = `available` + ?, `version` = `version` + 1 WHERE `account_id` = 'treasury' AND `asset_id` = 'CASH']], params = { net_currency } }
        queries[#queries + 1] = { query = [[UPDATE `sky_phone_crypto_balances` SET `available` = `available` - ?, `version` = `version` + 1 WHERE `account_id` = 'treasury' AND `asset_id` = ? AND `available` >= ?]], params = { quantity, quote.market_id, quantity } }
        queries[#queries + 1] = { query = [[INSERT INTO `sky_phone_crypto_balances` (`account_id`,`asset_id`,`available`,`version`) VALUES (?, ?, ?, 1) ON DUPLICATE KEY UPDATE `available` = `available` + VALUES(`available`), `version` = `version` + 1]], params = { player_account, quote.market_id, quantity } }
    else
        queries[#queries + 1] = { query = [[UPDATE `sky_phone_crypto_balances` SET `available` = `available` - ?, `version` = `version` + 1 WHERE `account_id` = ? AND `asset_id` = ? AND `available` >= ?]], params = { quantity, player_account, quote.market_id, quantity } }
        queries[#queries + 1] = { query = [[UPDATE `sky_phone_crypto_balances` SET `available` = `available` + ?, `version` = `version` + 1 WHERE `account_id` = 'treasury' AND `asset_id` = ?]], params = { quantity, quote.market_id } }
        queries[#queries + 1] = { query = [[UPDATE `sky_phone_crypto_balances` SET `available` = `available` - ?, `version` = `version` + 1 WHERE `account_id` = 'treasury' AND `asset_id` = 'CASH' AND `available` >= ?]], params = { net_currency, net_currency } }
        queries[#queries + 1] = { query = [[UPDATE `sky_phone_crypto_balances` SET `available` = `available` + ?, `version` = `version` + 1 WHERE `account_id` = ? AND `asset_id` = 'CASH']], params = { net_currency, player_account } }
    end
    queries[#queries + 1] = { query = [[INSERT INTO `sky_phone_crypto_ledger_entries` (`operation_id`,`account_id`,`asset_id`,`delta`) VALUES (?, ?, 'CASH', ?), (?, 'treasury', 'CASH', ?), (?, ?, ?, ?), (?, 'treasury', ?, ?)]], params = {
        operation_id, player_account, quote.side == "buy" and -net_currency or net_currency,
        operation_id, quote.side == "buy" and net_currency or -net_currency,
        operation_id, player_account, quote.market_id, quote.side == "buy" and quantity or -quantity,
        operation_id, quote.market_id, quote.side == "buy" and -quantity or quantity,
    } }
    queries[#queries + 1] = { query = [[INSERT INTO `sky_phone_crypto_fills` (`id`,`operation_id`,`quote_id`,`market_id`,`side`,`quantity`,`price`,`gross`,`fee`,`net`) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)]], params = { fill_id, operation_id, quote.id, quote.market_id, quote.side, quantity, quote.price, quote.gross, quote.fee, quote.net } }
    queries[#queries + 1] = { query = [[UPDATE `sky_phone_crypto_quotes` SET `consumed_operation_id` = ? WHERE `id` = ? AND `consumed_operation_id` IS NULL]], params = { operation_id, quote.id } }
    queries[#queries + 1] = { query = [[UPDATE `sky_phone_crypto_operations` SET `status` = 'completed' WHERE `id` = ?]], params = { operation_id } }
    if not Bridge.Database.Transaction(queries) then
        return { success = false, error = "request_failed" }
    end
    audit(profile.id, profile.owner_identifier, "trade_completed", operation_id)
    return { success = true, data = bootstrap(profile) }
end

Bridge.Callbacks.Register("sky_phone:crypto:execute", function(source, data)
    if not SkyPhone.AllowOperation(source, "crypto:trade", Config.Crypto.ActionsPerMinute, 60) then
        return { success = false, error = "rate_limited" }
    end
    local profile, error_response = authenticated_profile(source)
    if not profile then
        return error_response
    end
    return with_profile_lock(profile.id, function()
        return with_exchange_lock(function()
            return execute_trade(profile, type(data) == "table" and data or {})
        end)
    end)
end)

local function settlement_ledger_queries(operation_id, profile_id, kind, ledger_amount)
    local player_account = account_id(profile_id)
    local queries = {}
    if kind == "deposit" then
        queries[#queries + 1] = { query = [[UPDATE `sky_phone_crypto_balances` SET `available` = `available` + ?, `version` = `version` + 1 WHERE `account_id` = ? AND `asset_id` = 'CASH']], params = { ledger_amount, player_account } }
        queries[#queries + 1] = { query = [[INSERT INTO `sky_phone_crypto_ledger_entries` (`operation_id`,`account_id`,`asset_id`,`delta`) VALUES (?, ?, 'CASH', ?), (?, 'external:bank', 'CASH', ?)]], params = { operation_id, player_account, ledger_amount, operation_id, -ledger_amount } }
    else
        queries[#queries + 1] = { query = [[UPDATE `sky_phone_crypto_balances` SET `locked` = `locked` - ?, `version` = `version` + 1 WHERE `account_id` = ? AND `asset_id` = 'CASH' AND `locked` >= ?]], params = { ledger_amount, player_account, ledger_amount } }
        queries[#queries + 1] = { query = [[INSERT INTO `sky_phone_crypto_ledger_entries` (`operation_id`,`account_id`,`asset_id`,`delta`) VALUES (?, ?, 'CASH', ?), (?, 'external:bank', 'CASH', ?)]], params = { operation_id, player_account, -ledger_amount, operation_id, ledger_amount } }
    end
    queries[#queries + 1] = { query = [[UPDATE `sky_phone_crypto_operations` SET `status` = 'completed' WHERE `id` = ? AND `status` = 'external_applied']], params = { operation_id } }
    queries[#queries + 1] = { query = [[UPDATE `sky_phone_crypto_settlements` SET `state` = 'completed' WHERE `operation_id` = ? AND `state` = 'external_applied']], params = { operation_id } }
    return queries
end

local function settle(source, profile, kind, data)
    local key = idempotency_key(data.idempotencyKey)
    local amount = parse_whole(data.amount, Config.Crypto.MinimumSettlement, Config.Crypto.MaximumSettlement)
    if not key or not amount then
        return { success = false, error = "invalid_amount" }
    end
    if not verify_password(profile.id, data.password) then
        audit(profile.id, profile.owner_identifier, "settlement_reauth_failed", kind)
        return { success = false, error = "invalid_credentials" }
    end
    local existing = Bridge.Database.Query([[
        SELECT `status` FROM `sky_phone_crypto_operations`
        WHERE `profile_id` = ? AND `type` = ? AND `idempotency_key` = ? LIMIT 1
    ]], { profile.id, kind, key })[1]
    if existing then
        return existing.status == "completed"
            and { success = true, data = bootstrap(profile) }
            or { success = false, error = "settlement_pending" }
    end
    local ledger_amount = amount * Config.Crypto.PriceScale
    local daily_limit = kind == "deposit" and Config.Crypto.DailyDepositLimit
        or Config.Crypto.DailyWithdrawalLimit
    if daily_total(profile.id, kind) + ledger_amount > daily_limit * Config.Crypto.PriceScale then
        return { success = false, error = "limit_exceeded" }
    end
    if kind == "withdrawal" and balance(account_id(profile.id), "CASH") < ledger_amount then
        return { success = false, error = "insufficient_funds" }
    end
    local operation_id = new_id()
    local request_hash = Bridge.Database.Query(
        "SELECT SHA2(CONCAT(?, ':', ?, ':', ?), 256) AS `hash`",
        { kind, amount, key }
    )[1].hash
    local prepared = {
        {
            query = [[INSERT INTO `sky_phone_crypto_operations`
                (`id`,`profile_id`,`type`,`idempotency_key`,`request_hash`,`status`,`amount`)
                VALUES (?, ?, ?, ?, ?, 'prepared', ?)]],
            params = { operation_id, profile.id, kind, key, request_hash, ledger_amount },
        },
        {
            query = [[INSERT INTO `sky_phone_crypto_settlements`
                (`operation_id`,`owner_identifier`,`framework_account`,`amount`,`state`)
                VALUES (?, ?, ?, ?, 'prepared')]],
            params = { operation_id, profile.owner_identifier, Config.Crypto.BankAccount, amount },
        },
    }
    if kind == "withdrawal" then
        prepared[#prepared + 1] = {
            query = [[UPDATE `sky_phone_crypto_balances`
                SET `available` = `available` - ?, `locked` = `locked` + ?, `version` = `version` + 1
                WHERE `account_id` = ? AND `asset_id` = 'CASH' AND `available` >= ?]],
            params = { ledger_amount, ledger_amount, account_id(profile.id), ledger_amount },
        }
    end
    if not Bridge.Database.Transaction(prepared) then
        return { success = false, error = "request_failed" }
    end
    Bridge.Database.Query("UPDATE `sky_phone_crypto_operations` SET `status` = 'external_pending' WHERE `id` = ?", { operation_id })
    Bridge.Database.Query("UPDATE `sky_phone_crypto_settlements` SET `state` = 'external_pending' WHERE `operation_id` = ?", { operation_id })
    local money_success, money_result = pcall(
        kind == "deposit" and Bridge.Framework.RemoveMoney or Bridge.Framework.AddMoney,
        source,
        Config.Crypto.BankAccount,
        amount
    )
    if not money_success then
        Bridge.Database.Query("UPDATE `sky_phone_crypto_operations` SET `status` = 'manual_review', `detail` = 'framework_call_ambiguous' WHERE `id` = ?", { operation_id })
        Bridge.Database.Query("UPDATE `sky_phone_crypto_settlements` SET `state` = 'manual_review' WHERE `operation_id` = ?", { operation_id })
        audit(profile.id, profile.owner_identifier, "settlement_manual_review", operation_id)
        return { success = false, error = "settlement_pending" }
    end
    if not money_result then
        local failed = {
            { query = [[UPDATE `sky_phone_crypto_operations` SET `status` = 'failed', `detail` = 'framework_rejected' WHERE `id` = ?]], params = { operation_id } },
            { query = [[UPDATE `sky_phone_crypto_settlements` SET `state` = 'failed' WHERE `operation_id` = ?]], params = { operation_id } },
        }
        if kind == "withdrawal" then
            failed[#failed + 1] = { query = [[UPDATE `sky_phone_crypto_balances` SET `available` = `available` + ?, `locked` = `locked` - ?, `version` = `version` + 1 WHERE `account_id` = ? AND `asset_id` = 'CASH' AND `locked` >= ?]], params = { ledger_amount, ledger_amount, account_id(profile.id), ledger_amount } }
        end
        Bridge.Database.Transaction(failed)
        return { success = false, error = kind == "deposit" and "insufficient_funds" or "request_failed" }
    end
    Bridge.Database.Query("UPDATE `sky_phone_crypto_operations` SET `status` = 'external_applied' WHERE `id` = ?", { operation_id })
    Bridge.Database.Query("UPDATE `sky_phone_crypto_settlements` SET `state` = 'external_applied' WHERE `operation_id` = ?", { operation_id })
    local ledger_queries = settlement_ledger_queries(operation_id, profile.id, kind, ledger_amount)
    if not Bridge.Database.Transaction(ledger_queries) then
        Bridge.Database.Query("UPDATE `sky_phone_crypto_operations` SET `status` = 'manual_review', `detail` = 'ledger_apply_failed' WHERE `id` = ?", { operation_id })
        Bridge.Database.Query("UPDATE `sky_phone_crypto_settlements` SET `state` = 'manual_review' WHERE `operation_id` = ?", { operation_id })
        audit(profile.id, profile.owner_identifier, "settlement_manual_review", operation_id)
        return { success = false, error = "settlement_pending" }
    end
    sessions[source].recently_authenticated_at = os.time()
    audit(profile.id, profile.owner_identifier, "settlement_completed", operation_id)
    return { success = true, data = bootstrap(profile) }
end

for _, callback in ipairs({
    { name = "deposit", kind = "deposit" },
    { name = "withdraw", kind = "withdrawal" },
}) do
    Bridge.Callbacks.Register("sky_phone:crypto:" .. callback.name, function(source, data)
        if not SkyPhone.AllowOperation(source, "crypto:settlement", 8, 60) then
            return { success = false, error = "rate_limited" }
        end
        local profile, error_response = authenticated_profile(source)
        if not profile then
            return error_response
        end
        return with_profile_lock(profile.id, function()
            return settle(source, profile, callback.kind, type(data) == "table" and data or {})
        end)
    end)
end

AddEventHandler("playerDropped", function()
    sessions[source] = nil
end)

ensure_schema()
initialize_markets()

local function reconcile_settlements(include_recent)
    local age_clause = include_recent and "" or " AND settlement.`updated_at` < DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 5 MINUTE)"
    local rows = Bridge.Database.Query([[
        SELECT operation.`id`, operation.`profile_id`, operation.`type`, operation.`amount`,
            operation.`status`, settlement.`state`
        FROM `sky_phone_crypto_operations` operation
        JOIN `sky_phone_crypto_settlements` settlement ON settlement.`operation_id` = operation.`id`
        WHERE operation.`status` IN ('prepared','external_pending','external_applied')
    ]] .. age_clause, {})
    for _, operation in ipairs(rows) do
        local ledger_amount = tonumber(operation.amount)
        if operation.status == "prepared" then
            local queries = {}
            if operation.type == "withdrawal" then
                queries[#queries + 1] = { query = [[UPDATE `sky_phone_crypto_balances` SET `available` = `available` + ?, `locked` = `locked` - ?, `version` = `version` + 1 WHERE `account_id` = ? AND `asset_id` = 'CASH' AND `locked` >= ?]], params = { ledger_amount, ledger_amount, account_id(operation.profile_id), ledger_amount } }
            end
            queries[#queries + 1] = { query = [[UPDATE `sky_phone_crypto_operations` SET `status` = 'cancelled', `detail` = 'reconciled_before_external_call' WHERE `id` = ? AND `status` = 'prepared']], params = { operation.id } }
            queries[#queries + 1] = { query = [[UPDATE `sky_phone_crypto_settlements` SET `state` = 'cancelled' WHERE `operation_id` = ? AND `state` = 'prepared']], params = { operation.id } }
            Bridge.Database.Transaction(queries)
        elseif operation.status == "external_pending" then
            Bridge.Database.Transaction({
                { query = [[UPDATE `sky_phone_crypto_operations` SET `status` = 'manual_review', `detail` = 'reconciled_ambiguous_external_call' WHERE `id` = ? AND `status` = 'external_pending']], params = { operation.id } },
                { query = [[UPDATE `sky_phone_crypto_settlements` SET `state` = 'manual_review' WHERE `operation_id` = ? AND `state` = 'external_pending']], params = { operation.id } },
            })
        elseif operation.status == "external_applied" then
            local entries = Bridge.Database.Query(
                "SELECT COUNT(*) AS `count` FROM `sky_phone_crypto_ledger_entries` WHERE `operation_id` = ?",
                { operation.id }
            )[1]
            if tonumber(entries and entries.count) == 0 then
                Bridge.Database.Transaction(settlement_ledger_queries(
                    operation.id,
                    operation.profile_id,
                    operation.type,
                    ledger_amount
                ))
            else
                Bridge.Database.Transaction({
                    { query = [[UPDATE `sky_phone_crypto_operations` SET `status` = 'manual_review', `detail` = 'unexpected_partial_ledger' WHERE `id` = ?]], params = { operation.id } },
                    { query = [[UPDATE `sky_phone_crypto_settlements` SET `state` = 'manual_review' WHERE `operation_id` = ?]], params = { operation.id } },
                })
            end
        end
    end
end

reconcile_settlements(true)

CreateThread(function()
    while true do
        Wait(5 * 60 * 1000)
        reconcile_settlements(false)
    end
end)

CreateThread(function()
    while true do
        Wait(Config.Crypto.PriceTickSeconds * 1000)
        with_exchange_lock(function()
            for _, market_id in ipairs(market_order) do
            local config = markets[market_id]
            local row = Bridge.Database.Query(
                "SELECT `price`,`version`,`status` FROM `sky_phone_crypto_markets` WHERE `id` = ? LIMIT 1",
                { market_id }
            )[1]
            if row and row.status == "active" then
                local price = tonumber(row.price) or config.InitialPrice
                local movement = exports[GetCurrentResourceName()]:CryptoRandomInt(
                    -config.VolatilityBasisPoints,
                    config.VolatilityBasisPoints + 1
                )
                if type(movement) ~= "number" then
                    error("[sky_phone] Crypto entropy provider did not return a market movement.")
                end
                local next_price = math.floor(price * (10000 + movement) / 10000)
                next_price = math.max(config.MinimumPrice, math.min(config.MaximumPrice, next_price))
                local next_version = (tonumber(row.version) or 0) + 1
                if Bridge.Database.Transaction({
                    { query = [[UPDATE `sky_phone_crypto_markets` SET `price` = ?, `version` = ? WHERE `id` = ? AND `version` = ?]], params = { next_price, next_version, market_id, row.version } },
                    { query = [[INSERT INTO `sky_phone_crypto_market_ticks` (`market_id`,`version`,`price`) VALUES (?, ?, ?)]], params = { market_id, next_version, next_price } },
                }) then
                    Bridge.Database.Query([[
                        DELETE FROM `sky_phone_crypto_market_ticks`
                        WHERE `market_id` = ? AND `id` NOT IN (
                            SELECT `id` FROM (
                                SELECT `id` FROM `sky_phone_crypto_market_ticks`
                                WHERE `market_id` = ? ORDER BY `id` DESC LIMIT 1440
                            ) retained
                        )
                    ]], { market_id, market_id })
                end
            end
            end
        end)
    end
end)

end)
