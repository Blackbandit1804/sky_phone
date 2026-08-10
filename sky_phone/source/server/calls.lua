Bridge.Database.AfterMigration("sky_phone", function()

SkyPhoneCalls = {}

local calls = {}
local active_by_source = {}
local active_by_sim = {}
local dial_locks = {}
local dialing_by_sim = {}
local next_voice_channel = 10000

local function uuid()
    local rows = Bridge.Database.Query("SELECT UUID() AS `id`", {})
    if not rows[1] or type(rows[1].id) ~= "string" then
        error("[sky_phone] Database did not generate a call UUID.")
    end
    return rows[1].id
end

local function trim(value)
    if type(value) ~= "string" then
        return nil
    end
    return value:match("^%s*(.-)%s*$")
end

local function scope_for_device(device)
    if device.account_id then
        return tonumber(device.account_id), nil
    end
    return nil, device.imei
end

local function current_scope(source)
    local session, error_response = SkyPhone.RequireSession(source)
    if not session then
        return nil, error_response
    end
    local device = SkyPhone.LoadDevice(session.imei)
    if not device then
        return nil, { success = false, error = "device_not_found" }
    end
    local account_id, device_imei = scope_for_device(device)
    return {
        account_id = account_id,
        device = device,
        device_imei = device_imei,
        session = session,
    }
end

local function scope_condition(scope, alias)
    local prefix = alias and (alias .. ".") or ""
    if scope.account_id then
        return prefix .. "`account_id` = ?", { scope.account_id }
    end
    return prefix .. "`device_imei` = ?", { scope.device_imei }
end

local function find_device_holder(imei)
    for _, player_source in ipairs(Bridge.Framework.GetPlayers()) do
        local source = tonumber(player_source) or player_source
        if SkyPhone.FindDeviceSlots(source, imei)[1] then
            return source
        end
    end
    return nil
end

local function airplane_mode(imei)
    local rows = Bridge.Database.Query([[
        SELECT `payload` FROM `sky_phone_device_data`
        WHERE `device_imei` = ? AND `namespace` = 'settings' LIMIT 1
    ]], { imei })
    if not rows[1] then
        return false
    end
    local payload = json.decode(rows[1].payload)
    return payload and payload.settings and payload.settings.airplaneMode == true
end

local function add_call_entry(call_id, device, direction, status, other_number)
    local account_id, device_imei = scope_for_device(device)
    Bridge.Database.Query([[
        INSERT INTO `sky_phone_call_entries`
            (`call_id`, `account_id`, `device_imei`, `direction`, `status`, `other_number`)
        VALUES (?, ?, ?, ?, ?, ?)
    ]], { call_id, account_id, device_imei, direction, status, other_number })
end

local function send_state(call, source, state, channel)
    local outgoing = source == call.caller_source
    local payload = {
        id = call.id,
        state = state,
        direction = outgoing and "outgoing" or "incoming",
        otherNumber = outgoing and call.callee_number or call.caller_number,
        startedAt = call.started_at,
        answeredAt = call.answered_at,
        channel = channel,
    }
    if call.payphone and outgoing then
        payload.elapsedSeconds = call.payphone.elapsed_seconds or 0
        payload.totalCost = call.payphone.total_cost or 0
        TriggerClientEvent("sky_phone:payphone:state", source, payload)
        return
    end
    TriggerClientEvent("sky_phone:call:state", source, payload)
end

local function notify_recents(device, source)
    if device.account_id then
        SkyPhone.NotifyAccount(device.account_id, "sky_phone:calls:changed", {})
    elseif source then
        TriggerClientEvent("sky_phone:calls:changed", source)
    end
end

local function settle_payphone_call(call, duration)
    local payphone = call.payphone
    local elapsed_seconds = math.max(0, math.floor(tonumber(duration) or 0))
    local price_per_second = math.max(0, math.floor(tonumber(payphone.price_per_second) or 0))
    local billable_seconds = elapsed_seconds
    local total_cost = billable_seconds * price_per_second

    if total_cost > 0 then
        local available_money = tonumber(Bridge.Framework.GetMoney(call.caller_source, Config.Payphones.PaymentAccount))
        if not available_money then
            Bridge.Debug(
                "error",
                "[sky_phone] Payphone settlement could not read the balance for source %s.",
                tostring(call.caller_source)
            )
            billable_seconds = 0
            total_cost = 0
        elseif available_money < total_cost then
            billable_seconds = math.min(elapsed_seconds, math.floor(math.max(0, available_money) / price_per_second))
            total_cost = billable_seconds * price_per_second
        end
    end

    local charged = total_cost == 0
    if total_cost > 0 then
        local success, result = pcall(
            Bridge.Framework.RemoveMoney,
            call.caller_source,
            Config.Payphones.PaymentAccount,
            total_cost
        )
        charged = success and result and true or false
        if not success then
            Bridge.Debug(
                "error",
                "[sky_phone] Payphone settlement failed for source %s: %s",
                tostring(call.caller_source),
                tostring(result)
            )
        elseif not result then
            Bridge.Debug(
                "warn",
                "[sky_phone] Payphone settlement was rejected for source %s.",
                tostring(call.caller_source)
            )
        end
    end

    payphone.elapsed_seconds = elapsed_seconds
    payphone.total_cost = charged and total_cost or 0
    return charged and billable_seconds == elapsed_seconds
end

local function send_payphone_visual(call, action, delay_ms)
    if not call.payphone then
        return
    end
    local coords = call.payphone.coords
    local payload = {
        id = call.id,
        callerSource = call.caller_source,
        model = call.payphone.model,
        coords = { x = coords.x, y = coords.y, z = coords.z },
    }
    local event_name = ("sky_phone:payphone:visual:%s"):format(action)
    local routing_bucket = call.payphone.routing_bucket
    local targets = {}
    if action == "stop" and call.payphone.visual_targets then
        for _, target in ipairs(call.payphone.visual_targets) do
            targets[#targets + 1] = target
        end
    else
        for _, player_source in ipairs(Bridge.Framework.GetPlayers()) do
            local target = tonumber(player_source) or player_source
            if GetPlayerRoutingBucket(target) == routing_bucket then
                targets[#targets + 1] = target
            end
        end
        if action == "start" then
            call.payphone.visual_targets = targets
        end
    end
    local function dispatch()
        for _, target in ipairs(targets) do
            TriggerClientEvent(event_name, target, payload)
        end
    end
    if delay_ms and delay_ms > 0 then
        SetTimeout(delay_ms, dispatch)
    else
        dispatch()
    end
end

local function finish_call(call, status)
    if not call or call.ended then
        return
    end
    call.ended = true
    local ended_at = os.time()
    local duration = call.answered_at and math.max(0, ended_at - call.answered_at) or 0
    if call.payphone and call.answered_at and not settle_payphone_call(call, duration)
        and status ~= "disconnected"
    then
        status = "insufficient_funds"
    end
    local callee_status = status
    if status == "no_answer" or status == "cancelled" then
        callee_status = "missed"
    end
    if call.payphone and call.answered_at and status == "insufficient_funds" then
        callee_status = "completed"
    end
    if not call.payphone then
        Bridge.Database.Transaction({
            {
                query = [[
                    UPDATE `sky_phone_calls`
                    SET `status` = ?, `ended_at` = CURRENT_TIMESTAMP, `duration_seconds` = ?
                    WHERE `id` = ?
                ]],
                params = { status, duration, call.id },
            },
            {
                query = "UPDATE `sky_phone_call_entries` SET `status` = ? WHERE `call_id` = ? AND `direction` = 'outgoing'",
                params = { status, call.id },
            },
            {
                query = "UPDATE `sky_phone_call_entries` SET `status` = ? WHERE `call_id` = ? AND `direction` = 'incoming'",
                params = { callee_status, call.id },
            },
        })
    end
    active_by_source[call.caller_source] = nil
    if call.caller_sim_id then
        active_by_sim[call.caller_sim_id] = nil
    end
    if call.callee_source then
        active_by_source[call.callee_source] = nil
    end
    if call.callee_sim_id then
        active_by_sim[call.callee_sim_id] = nil
    end
    send_state(call, call.caller_source, status)
    if call.callee_source then
        send_state(call, call.callee_source, callee_status)
    end
    if call.caller_device then
        notify_recents(call.caller_device, call.caller_source)
    end
    if call.callee_device and not call.payphone then
        notify_recents(call.callee_device, call.callee_source)
    end
    if call.payphone then
        local hangup_duration = math.max(
            250,
            math.floor(tonumber(Config.Payphones.Animation.HangupDurationMs) or 1200)
        )
        send_payphone_visual(call, "stop", hangup_duration)
    end
    calls[call.id] = nil
end

function SkyPhoneCalls.EndForSim(sim_id, reason)
    local call_id = active_by_sim[sim_id]
    if call_id then
        finish_call(calls[call_id], reason or "ended")
    end
end

function SkyPhoneCalls.LinkAccountData(account_id, imei)
    local counts = Bridge.Database.Query([[
        SELECT
            (SELECT COUNT(*) FROM `sky_phone_contacts` WHERE `account_id` = ?) AS `contacts`,
            (SELECT COUNT(*) FROM `sky_phone_call_entries` WHERE `account_id` = ?) AS `recents`
    ]], { account_id, account_id })
    local has_cloud_data = counts[1] and ((tonumber(counts[1].contacts) or 0) > 0 or (tonumber(counts[1].recents) or 0) > 0)
    if has_cloud_data then
        return Bridge.Database.Transaction({
            { query = "DELETE FROM `sky_phone_contacts` WHERE `device_imei` = ? AND `account_id` IS NULL", params = { imei } },
            { query = "DELETE FROM `sky_phone_call_entries` WHERE `device_imei` = ? AND `account_id` IS NULL", params = { imei } },
        })
    end
    return Bridge.Database.Transaction({
        {
            query = "UPDATE `sky_phone_contacts` SET `account_id` = ?, `device_imei` = NULL WHERE `device_imei` = ? AND `account_id` IS NULL",
            params = { account_id, imei },
        },
        {
            query = "UPDATE `sky_phone_call_entries` SET `account_id` = ?, `device_imei` = NULL WHERE `device_imei` = ? AND `account_id` IS NULL",
            params = { account_id, imei },
        },
    })
end

function SkyPhoneCalls.CopyCloudToDevice(account_id, imei)
    return Bridge.Database.Transaction({
        { query = "DELETE FROM `sky_phone_contacts` WHERE `device_imei` = ? AND `account_id` IS NULL", params = { imei } },
        { query = "DELETE FROM `sky_phone_call_entries` WHERE `device_imei` = ? AND `account_id` IS NULL", params = { imei } },
        {
            query = [[
                INSERT INTO `sky_phone_contacts`
                    (`id`, `contact_id`, `device_imei`, `name`, `phone_number`, `created_at`, `updated_at`)
                SELECT UUID(), `contact_id`, ?, `name`, `phone_number`, `created_at`, `updated_at`
                FROM `sky_phone_contacts` WHERE `account_id` = ?
            ]],
            params = { imei, account_id },
        },
        {
            query = [[
                INSERT INTO `sky_phone_call_entries`
                    (`call_id`, `device_imei`, `direction`, `status`, `other_number`, `created_at`)
                SELECT `call_id`, ?, `direction`, `status`, `other_number`, `created_at`
                FROM `sky_phone_call_entries` WHERE `account_id` = ?
            ]],
            params = { imei, account_id },
        },
    })
end

Bridge.Callbacks.Register("sky_phone:contacts:list", function(source)
    local scope, error_response = current_scope(source)
    if not scope then
        return error_response
    end
    local condition, params = scope_condition(scope)
    local rows = Bridge.Database.Query(([[
        SELECT `contact_id` AS `id`, `name`, `phone_number`, `created_at`, `updated_at`
        FROM `sky_phone_contacts` WHERE %s ORDER BY LOWER(`name`), `phone_number`
    ]]):format(condition), params)
    return { success = true, data = rows }
end)

Bridge.Callbacks.Register("sky_phone:contacts:save", function(source, data)
    if not SkyPhone.AllowOperation(source, "contact_save", 30, 60) or type(data) ~= "table" then
        return { success = false, error = "invalid_request" }
    end
    local scope, error_response = current_scope(source)
    if not scope then
        return error_response
    end
    local name = trim(data.name)
    local number = SkyPhoneSimNumber.Normalize(data.phoneNumber, Config.Sim.NumberLength, Config.Sim.NumberPrefix)
    if not name or name == "" or #name > Config.Calls.ContactNameMaxLength or not number then
        return { success = false, error = "invalid_contact" }
    end
    local condition, condition_params = scope_condition(scope)
    local id = type(data.id) == "string" and data.id or uuid()
    if data.id then
        local owned_params = { id }
        for _, value in ipairs(condition_params) do
            owned_params[#owned_params + 1] = value
        end
        local owned = Bridge.Database.Query(("SELECT `id` FROM `sky_phone_contacts` WHERE `contact_id` = ? AND %s LIMIT 1"):format(condition), owned_params)
        if not owned[1] then
            return { success = false, error = "contact_not_found" }
        end
        local params = { name, number, id }
        for _, value in ipairs(condition_params) do
            params[#params + 1] = value
        end
        Bridge.Database.Query(([[
            UPDATE `sky_phone_contacts` SET `name` = ?, `phone_number` = ?
            WHERE `contact_id` = ? AND %s
        ]]):format(condition), params)
    else
        Bridge.Database.Query([[
            INSERT INTO `sky_phone_contacts` (`id`, `contact_id`, `account_id`, `device_imei`, `name`, `phone_number`)
            VALUES (?, ?, ?, ?, ?, ?)
        ]], { uuid(), id, scope.account_id, scope.device_imei, name, number })
    end
    if scope.account_id then
        SkyPhone.NotifyAccount(scope.account_id, "sky_phone:contacts:changed", {})
    end
    return { success = true, data = { id = id, name = name, phone_number = number } }
end)

Bridge.Callbacks.Register("sky_phone:contacts:delete", function(source, data)
    if type(data) ~= "table" or type(data.id) ~= "string" then
        return { success = false, error = "invalid_request" }
    end
    local scope, error_response = current_scope(source)
    if not scope then
        return error_response
    end
    local condition, values = scope_condition(scope)
    local params = { data.id }
    for _, value in ipairs(values) do
        params[#params + 1] = value
    end
    Bridge.Database.Query(("DELETE FROM `sky_phone_contacts` WHERE `contact_id` = ? AND %s"):format(condition), params)
    if scope.account_id then
        SkyPhone.NotifyAccount(scope.account_id, "sky_phone:contacts:changed", {})
    end
    return { success = true }
end)

Bridge.Callbacks.Register("sky_phone:calls:recents", function(source)
    local scope, error_response = current_scope(source)
    if not scope then
        return error_response
    end
    local condition, params = scope_condition(scope, "e")
    params[#params + 1] = Config.Calls.RecentPageSize
    local rows = Bridge.Database.Query(([[
        SELECT e.`id`, e.`call_id`, e.`direction`, e.`status`, e.`other_number`, e.`created_at`,
            c.`duration_seconds`
        FROM `sky_phone_call_entries` e
        JOIN `sky_phone_calls` c ON c.`id` = e.`call_id`
        WHERE %s ORDER BY e.`created_at` DESC, e.`id` DESC LIMIT ?
    ]]):format(condition), params)
    return { success = true, data = rows }
end)

local function create_terminal_call(scope, number, target_sim, status)
    local id = uuid()
    Bridge.Database.Query([[
        INSERT INTO `sky_phone_calls`
            (`id`, `caller_sim_id`, `callee_sim_id`, `caller_number`, `callee_number`, `status`, `ended_at`)
        VALUES (?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
    ]], { id, scope.device.sim_id, target_sim and target_sim.id or nil, scope.device.phone_number, number, status })
    add_call_entry(id, scope.device, "outgoing", status, number)
    notify_recents(scope.device, nil)
    return {
        id = id,
        state = status,
        direction = "outgoing",
        otherNumber = number,
        startedAt = os.time(),
    }
end

Bridge.Callbacks.Register("sky_phone:calls:dial", function(source, data)
    if not SkyPhone.AllowOperation(source, "call_dial", 15, 60) then
        return { success = false, error = "rate_limited" }
    end
    if type(data) ~= "table" then
        return { success = false, error = "invalid_request" }
    end
    if dial_locks[source] then
        return { success = false, error = "busy" }
    end
    dial_locks[source] = true
    local scope, error_response = current_scope(source)
    if not scope then
        dial_locks[source] = nil
        return error_response
    end
    if not scope.device.sim_id then
        dial_locks[source] = nil
        return { success = false, error = "no_sim" }
    end
    if airplane_mode(scope.device.imei) then
        dial_locks[source] = nil
        return { success = false, error = "airplane_mode" }
    end
    local number = SkyPhoneSimNumber.Normalize(data.phoneNumber, Config.Sim.NumberLength, Config.Sim.NumberPrefix)
    if not number then
        dial_locks[source] = nil
        return { success = false, error = "invalid_number" }
    end
    if number == scope.device.phone_number then
        dial_locks[source] = nil
        return { success = false, error = "self_call" }
    end
    if active_by_source[source] or active_by_sim[scope.device.sim_id] or dialing_by_sim[scope.device.sim_id] then
        dial_locks[source] = nil
        return { success = false, error = "busy" }
    end
    dialing_by_sim[scope.device.sim_id] = true
    local targets = Bridge.Database.Query([[
        SELECT s.`id`, s.`phone_number`, d.`imei`, d.`account_id`, d.`device_name`
        FROM `sky_phone_sims` s LEFT JOIN `sky_phone_devices` d ON d.`sim_id` = s.`id`
        WHERE s.`phone_number` = ? LIMIT 1
    ]], { number })
    local target = targets[1]
    if not target or not target.imei then
        local terminal = create_terminal_call(scope, number, target, "unavailable")
        dialing_by_sim[scope.device.sim_id] = nil
        dial_locks[source] = nil
        return { success = true, data = terminal }
    end
    local callee_source = find_device_holder(target.imei)
    if not callee_source or airplane_mode(target.imei) then
        local terminal = create_terminal_call(scope, number, target, "unavailable")
        dialing_by_sim[scope.device.sim_id] = nil
        dial_locks[source] = nil
        return { success = true, data = terminal }
    end
    if active_by_source[callee_source] or active_by_sim[target.id] or dialing_by_sim[target.id] then
        local terminal = create_terminal_call(scope, number, target, "busy")
        dialing_by_sim[scope.device.sim_id] = nil
        dial_locks[source] = nil
        return { success = true, data = terminal }
    end
    dialing_by_sim[target.id] = true

    local id = uuid()
    local call = {
        id = id,
        caller_source = source,
        caller_sim_id = scope.device.sim_id,
        caller_number = scope.device.phone_number,
        caller_device = scope.device,
        callee_source = callee_source,
        callee_sim_id = target.id,
        callee_number = number,
        callee_device = target,
        started_at = os.time(),
    }
    Bridge.Database.Query([[
        INSERT INTO `sky_phone_calls`
            (`id`, `caller_sim_id`, `callee_sim_id`, `caller_number`, `callee_number`, `status`)
        VALUES (?, ?, ?, ?, ?, 'ringing')
    ]], { id, call.caller_sim_id, call.callee_sim_id, call.caller_number, call.callee_number })
    add_call_entry(id, scope.device, "outgoing", "ringing", number)
    add_call_entry(id, target, "incoming", "ringing", call.caller_number)
    calls[id] = call
    active_by_source[source] = id
    active_by_source[callee_source] = id
    active_by_sim[call.caller_sim_id] = id
    active_by_sim[call.callee_sim_id] = id
    dialing_by_sim[call.caller_sim_id] = nil
    dialing_by_sim[call.callee_sim_id] = nil
    dial_locks[source] = nil
    send_state(call, source, "ringing")
    SkyPhone.OpenDeviceForCall(callee_source, target.imei)
    TriggerClientEvent("sky_phone:call:incoming", callee_source, {
        id = id,
        state = "ringing",
        direction = "incoming",
        otherNumber = call.caller_number,
        startedAt = call.started_at,
        device = {
            imei = target.imei,
            name = target.device_name,
        },
    })
    SetTimeout(Config.Calls.RingSeconds * 1000, function()
        if calls[id] and not calls[id].answered_at then
            finish_call(calls[id], "no_answer")
        end
    end)
    return { success = true, data = { id = id, state = "ringing", direction = "outgoing", otherNumber = number, startedAt = call.started_at } }
end)

local payphone_models = {}
for _, model_name in ipairs(Config.Payphones.Props or {}) do
    payphone_models[model_name] = true
end

local function valid_payphone_position(source, data)
    if type(data) ~= "table" or not payphone_models[data.model] or type(data.coords) ~= "table" then
        return nil
    end
    local x = tonumber(data.coords.x)
    local y = tonumber(data.coords.y)
    local z = tonumber(data.coords.z)
    if not x or not y or not z or x ~= x or y ~= y or z ~= z
        or math.abs(x) > 10000.0 or math.abs(y) > 10000.0 or math.abs(z) > 2000.0
    then
        return nil
    end
    local ped = GetPlayerPed(source)
    if not ped or ped == 0 then
        return nil
    end
    local player_coords = GetEntityCoords(ped)
    local booth_coords = vector3(x, y, z)
    if #(player_coords - booth_coords) > Config.Payphones.ServerValidationDistance then
        return nil
    end
    return booth_coords, data.model
end

local function payphone_terminal(number, state)
    return {
        id = ("payphone-terminal-%s-%s"):format(os.time(), math.random(100000, 999999)),
        state = state,
        direction = "outgoing",
        otherNumber = number,
        startedAt = os.time(),
        elapsedSeconds = 0,
        totalCost = 0,
    }
end

Bridge.Callbacks.Register("sky_phone:payphone:dial", function(source, data)
    if not Config.Payphones.Enabled or not SkyPhone.AllowOperation(source, "payphone_dial", 15, 60) then
        return { success = false, error = "rate_limited" }
    end
    local booth_coords, booth_model = valid_payphone_position(source, data)
    if not booth_coords then
        return { success = false, error = "invalid_payphone" }
    end
    if active_by_source[source] or dial_locks[source] then
        return { success = false, error = "busy" }
    end

    local number = SkyPhoneSimNumber.Normalize(data.phoneNumber, Config.Sim.NumberLength, Config.Sim.NumberPrefix)
    if not number then
        return { success = false, error = "invalid_number" }
    end
    local price_per_second = math.max(0, math.floor(tonumber(Config.Payphones.PricePerSecond) or 0))
    local available_money = Bridge.Framework.GetMoney(source, Config.Payphones.PaymentAccount)
    if price_per_second > 0 and (not available_money or available_money < price_per_second) then
        return { success = false, error = "insufficient_funds" }
    end

    dial_locks[source] = true
    local targets = Bridge.Database.Query([[
        SELECT s.`id`, s.`phone_number`, d.`imei`, d.`account_id`, d.`device_name`
        FROM `sky_phone_sims` s LEFT JOIN `sky_phone_devices` d ON d.`sim_id` = s.`id`
        WHERE s.`phone_number` = ? LIMIT 1
    ]], { number })
    local target = targets[1]
    if not target or not target.imei then
        dial_locks[source] = nil
        return { success = true, data = payphone_terminal(number, "unavailable") }
    end
    local callee_source = find_device_holder(target.imei)
    if not callee_source or callee_source == source or airplane_mode(target.imei) then
        dial_locks[source] = nil
        return { success = true, data = payphone_terminal(number, "unavailable") }
    end
    if active_by_source[callee_source] or active_by_sim[target.id] or dialing_by_sim[target.id] then
        dial_locks[source] = nil
        return { success = true, data = payphone_terminal(number, "busy") }
    end
    dialing_by_sim[target.id] = true

    local id = uuid()
    local call = {
        id = id,
        caller_source = source,
        caller_number = Config.Payphones.CallerNumber,
        callee_source = callee_source,
        callee_sim_id = target.id,
        callee_number = number,
        callee_device = target,
        started_at = os.time(),
        payphone = {
            elapsed_seconds = 0,
            total_cost = 0,
            coords = booth_coords,
            model = booth_model,
            price_per_second = price_per_second,
            routing_bucket = GetPlayerRoutingBucket(source),
        },
    }
    calls[id] = call
    active_by_source[source] = id
    active_by_source[callee_source] = id
    active_by_sim[target.id] = id
    dialing_by_sim[target.id] = nil
    dial_locks[source] = nil

    send_state(call, source, "ringing")
    send_payphone_visual(call, "start")
    SkyPhone.OpenDeviceForCall(callee_source, target.imei)
    TriggerClientEvent("sky_phone:call:incoming", callee_source, {
        id = id,
        state = "ringing",
        direction = "incoming",
        otherNumber = call.caller_number,
        startedAt = call.started_at,
        device = {
            imei = target.imei,
            name = target.device_name,
        },
    })
    SetTimeout(math.max(1, math.floor(tonumber(Config.Payphones.NoAnswerTimeoutSeconds) or 30)) * 1000, function()
        if calls[id] and not calls[id].answered_at then
            finish_call(calls[id], "no_answer")
        end
    end)
    return {
        success = true,
        data = {
            id = id,
            state = "ringing",
            direction = "outgoing",
            otherNumber = number,
            startedAt = call.started_at,
            elapsedSeconds = 0,
            totalCost = 0,
        },
    }
end)

Bridge.Callbacks.Register("sky_phone:calls:answer", function(source, data)
    local call = type(data) == "table" and calls[data.id] or nil
    if not call or call.callee_source ~= source or call.answered_at then
        return { success = false, error = "call_not_found" }
    end
    if not SkyPhone.FindDeviceSlots(source, call.callee_device.imei)[1] then
        finish_call(call, "unavailable")
        return { success = false, error = "phone_not_owned" }
    end
    if Config.Calls.VoiceProvider ~= "pma" or GetResourceState("pma-voice") ~= "started" then
        return { success = false, error = "voice_unavailable" }
    end
    call.answered_at = os.time()
    call.channel = next_voice_channel
    next_voice_channel = next_voice_channel + 1
    if not call.payphone then
        Bridge.Database.Query("UPDATE `sky_phone_calls` SET `status` = 'connected', `answered_at` = CURRENT_TIMESTAMP WHERE `id` = ?", { call.id })
        Bridge.Database.Query("UPDATE `sky_phone_call_entries` SET `status` = 'connected' WHERE `call_id` = ?", { call.id })
    end
    send_state(call, call.caller_source, "connected", call.channel)
    send_state(call, call.callee_source, "connected", call.channel)
    return { success = true }
end)

Bridge.Callbacks.Register("sky_phone:calls:decline", function(source, data)
    local call = type(data) == "table" and calls[data.id] or nil
    if not call or call.callee_source ~= source or call.answered_at then
        return { success = false, error = "call_not_found" }
    end
    finish_call(call, "declined")
    return { success = true }
end)

Bridge.Callbacks.Register("sky_phone:calls:hangup", function(source, data)
    local call_id = active_by_source[source]
    local call = call_id and calls[call_id] or nil
    if not call or (call.payphone and call.caller_source == source)
        or (type(data) == "table" and data.id and data.id ~= call.id)
    then
        return { success = false, error = "call_not_found" }
    end
    finish_call(call, call.answered_at and "completed" or "cancelled")
    return { success = true }
end)

Bridge.Callbacks.Register("sky_phone:payphone:hangup", function(source, data)
    local call_id = active_by_source[source]
    local call = call_id and calls[call_id] or nil
    if not call or not call.payphone or call.caller_source ~= source
        or (type(data) == "table" and data.id and data.id ~= call.id)
    then
        return { success = false, error = "call_not_found" }
    end
    finish_call(call, call.answered_at and "completed" or "cancelled")
    return { success = true }
end)

CreateThread(function()
    while true do
        Wait(1000)
        local calls_to_finish = {}
        for call_id, call in pairs(calls) do
            local caller_valid = true
            if call.payphone then
                local caller_ped = GetPlayerPed(call.caller_source)
                caller_valid = caller_ped and caller_ped ~= 0
                if caller_valid then
                    caller_valid = #(GetEntityCoords(caller_ped) - call.payphone.coords)
                        <= Config.Payphones.MaximumCallDistance
                end
            else
                caller_valid = SkyPhone.FindDeviceSlots(call.caller_source, call.caller_device.imei)[1] ~= nil
            end
            local callee_valid = not call.callee_source
                or SkyPhone.FindDeviceSlots(call.callee_source, call.callee_device.imei)[1] ~= nil
            if not caller_valid or not callee_valid then
                calls_to_finish[call_id] = "disconnected"
            elseif call.payphone and call.answered_at and not call.ended then
                local elapsed_seconds = math.max(0, os.time() - call.answered_at)
                local total_cost = elapsed_seconds * call.payphone.price_per_second
                local available_money = tonumber(
                    Bridge.Framework.GetMoney(call.caller_source, Config.Payphones.PaymentAccount)
                )
                if total_cost > 0 and (not available_money or available_money < total_cost) then
                    calls_to_finish[call_id] = "insufficient_funds"
                elseif call.payphone.elapsed_seconds ~= elapsed_seconds then
                    call.payphone.elapsed_seconds = elapsed_seconds
                    call.payphone.total_cost = total_cost
                    send_state(call, call.caller_source, "connected", call.channel)
                end
            end
        end
        for call_id, status in pairs(calls_to_finish) do
            finish_call(calls[call_id], status)
        end
    end
end)

AddEventHandler("playerDropped", function()
    local call_id = active_by_source[source]
    if call_id then
        finish_call(calls[call_id], "disconnected")
    end
end)

AddEventHandler("onResourceStop", function(resource_name)
    if resource_name ~= GetCurrentResourceName() then
        return
    end
    local call_ids = {}
    for call_id in pairs(calls) do
        call_ids[#call_ids + 1] = call_id
    end
    for _, call_id in ipairs(call_ids) do
        finish_call(calls[call_id], "disconnected")
    end
end)
end)
