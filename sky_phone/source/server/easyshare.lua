SkyPhoneEasyShare = {}

Bridge.Database.AfterMigration("sky_phone", function()
local active_transfers = {}
local valid_kinds = {
    contact = true,
    document = true,
    link = true,
    location = true,
    note = true,
    photo = true,
    playlist = true,
    post = true,
    profile = true,
    text = true,
    track = true,
    video = true,
}
local valid_apps = {
    camera = true,
    crewlink = true,
    darkchat = true,
    feather = true,
    flare = true,
    fliptok = true,
    map = true,
    messages = true,
    music = true,
    notes = true,
    phone = true,
    photos = true,
    picstagram = true,
}
local valid_visibilities = { contacts = true, everyone = true, hidden = true }

local function uuid()
    local rows = Bridge.Database.Query("SELECT UUID() AS `id`", {})
    local id = rows[1] and rows[1].id
    if type(id) ~= "string" then
        error("[sky_phone] Database did not generate an EasyShare id.")
    end
    return id
end

local function trim(value, maximum)
    if type(value) ~= "string" then
        return nil
    end
    local result = value:match("^%s*(.-)%s*$")
    if result == "" or #result > maximum then
        return nil
    end
    return result
end

local function current_device(source)
    local session, error_response = SkyPhone.RequireSession(source)
    if not session then
        return nil, error_response
    end
    local device = SkyPhone.LoadDevice(session.imei)
    if not device then
        return nil, { success = false, error = "device_not_found" }
    end
    return device
end

local function owner_condition(device, alias)
    local prefix = alias and ("`" .. alias .. "`.") or ""
    if device.account_id then
        return prefix .. "`account_id` = ?", { tonumber(device.account_id) }
    end
    return prefix .. "`account_id` IS NULL AND " .. prefix .. "`device_imei` = ?", { device.imei }
end

local function append_params(target, values)
    for _, value in ipairs(values) do
        target[#target + 1] = value
    end
end

local function display_name(source)
    local first = trim(Bridge.Framework.GetFirstname(source), 80)
    local last = trim(Bridge.Framework.GetLastname(source), 80)
    local name = table.concat({ first or "", last or "" }, " "):match("^%s*(.-)%s*$")
    return name ~= "" and name or GetPlayerName(source) or ("Player %s"):format(source)
end

local function visibility_for(imei)
    local rows = Bridge.Database.Query([[ 
        SELECT `visibility` FROM `sky_phone_easyshare_preferences`
        WHERE `device_imei` = ? LIMIT 1
    ]], { imei })
    local visibility = rows[1] and rows[1].visibility or Config.EasyShare.DefaultVisibility
    return valid_visibilities[visibility] and visibility or "hidden"
end

local function distance_between(left_source, right_source)
    if GetPlayerRoutingBucket(left_source) ~= GetPlayerRoutingBucket(right_source) then
        return nil
    end
    local left_ped = GetPlayerPed(left_source)
    local right_ped = GetPlayerPed(right_source)
    if left_ped == 0 or right_ped == 0 then
        return nil
    end
    return #(GetEntityCoords(left_ped) - GetEntityCoords(right_ped))
end

local function visible_to(target_device, sender_device, visibility)
    if visibility == "everyone" then
        return true
    end
    if visibility ~= "contacts" or not sender_device.phone_number then
        return false
    end
    local condition, owner_params = owner_condition(target_device)
    local params = { sender_device.phone_number }
    append_params(params, owner_params)
    local rows = Bridge.Database.Query(([[
        SELECT `id` FROM `sky_phone_contacts`
        WHERE `phone_number` = ? AND %s LIMIT 1
    ]]):format(condition), params)
    return rows[1] ~= nil
end

local function target_state(sender_source, target_source, sender_device)
    if target_source == sender_source then
        return nil
    end
    local target_device = current_device(target_source)
    if not target_device then
        return nil
    end
    local visibility = visibility_for(target_device.imei)
    if not visible_to(target_device, sender_device, visibility) then
        return nil
    end
    local distance = distance_between(sender_source, target_source)
    if not distance or distance > Config.EasyShare.MaximumDistance then
        return nil
    end
    return { device = target_device, distance = distance }
end

local function nearby_targets(source, device)
    local targets = {}
    for _, target in ipairs(Bridge.Framework.GetPlayers()) do
        local target_source = tonumber(target)
        if target_source then
            local state = target_state(source, target_source, device)
            if state then
                targets[#targets + 1] = {
                    id = target_source,
                    name = display_name(target_source),
                    distance = math.floor(state.distance * 10 + 0.5) / 10,
                }
            end
        end
    end
    table.sort(targets, function(left, right)
        return left.distance < right.distance
    end)
    return targets
end

local function sanitize_payload(source, device, data)
    if type(data) ~= "table" or not valid_kinds[data.kind] then
        return nil, "invalid_payload"
    end
    local title = trim(data.title, 160)
    local copy_text = trim(data.copyText, 4000)
    local app_id = trim(data.appId, 48)
    if not title or not copy_text or not app_id or not valid_apps[app_id] then
        return nil, "invalid_payload"
    end
    local payload = {
        appId = app_id,
        kind = data.kind,
        title = title,
        copyText = copy_text,
    }
    if type(data.id) == "string" and #data.id <= 128 then
        payload.id = data.id
    elseif type(data.id) == "number" and data.id > 0 and data.id == math.floor(data.id) then
        payload.id = data.id
    end
    if type(data.subtitle) == "string" and #data.subtitle <= 240 then
        payload.subtitle = data.subtitle
    end
    if type(data.link) == "string" and #data.link <= 500 and data.link:match("^[%w_%-]+://") then
        payload.link = data.link
    end

    local condition, owner_params = owner_condition(device)
    if data.kind == "contact" and type(payload.id) == "string" then
        local params = { payload.id }
        append_params(params, owner_params)
        local rows = Bridge.Database.Query(([[
            SELECT `name`, `phone_number`, `organization`, `notes`
            FROM `sky_phone_contacts` WHERE `contact_id` = ? AND %s LIMIT 1
        ]]):format(condition), params)
        local contact = rows[1]
        if not contact then
            return nil, "not_owned"
        end
        payload.title = contact.name
        payload.subtitle = contact.phone_number
        payload.copyText = ("%s\n%s"):format(contact.name, contact.phone_number)
        payload.meta = {
            name = contact.name,
            notes = contact.notes,
            organization = contact.organization,
            phoneNumber = contact.phone_number,
        }
    elseif data.kind == "note" and type(payload.id) == "string" then
        local params = { payload.id }
        append_params(params, owner_params)
        local rows = Bridge.Database.Query(([[
            SELECT `title`, `body` FROM `sky_phone_notes`
            WHERE `id` = ? AND %s LIMIT 1
        ]]):format(condition), params)
        local note = rows[1]
        if not note then
            return nil, "not_owned"
        end
        payload.title = note.title ~= "" and note.title or title
        payload.copyText = note.body
        payload.meta = { body = note.body, title = note.title }
    elseif data.kind == "photo" or data.kind == "video" then
        local url, media_error = SkyPhoneMedia.ResolveOwnedMedia(source, payload.id, data.kind)
        if not url then
            return nil, media_error or "not_owned"
        end
        local media_params = { tonumber(payload.id) }
        append_params(media_params, owner_params)
        local media_rows = Bridge.Database.Query(([[
            SELECT `remote_id` FROM `sky_phone_media`
            WHERE `id` = ? AND %s LIMIT 1
        ]]):format(condition), media_params)
        if not media_rows[1] then
            return nil, "not_owned"
        end
        payload.imageUrl = url
        payload.meta = { remoteId = media_rows[1].remote_id, url = url }
    elseif data.kind == "location" then
        local ped = GetPlayerPed(source)
        if ped == 0 then
            return nil, "location_unavailable"
        end
        local coords = GetEntityCoords(ped)
        payload.meta = { x = coords.x, y = coords.y, z = coords.z }
    elseif type(data.imageUrl) == "string" and #data.imageUrl <= 2048 and data.imageUrl:match("^https://") then
        payload.imageUrl = data.imageUrl
    end

    local encoded = json.encode(payload)
    if #encoded > Config.EasyShare.PayloadMaxBytes then
        return nil, "payload_too_large"
    end
    return payload, nil, encoded
end

function SkyPhoneEasyShare.SanitizeChatPayload(source, data)
    local device, error_response = current_device(source)
    if not device then
        return nil, error_response.error
    end
    return sanitize_payload(source, device, data)
end

local function transfer_for_source(transfer, source)
    local incoming = transfer.recipient_source == source
    return {
        id = transfer.id,
        direction = incoming and "incoming" or "outgoing",
        otherName = incoming and transfer.sender_name or transfer.recipient_name,
        payload = transfer.payload,
        progress = transfer.progress,
        status = transfer.status,
        createdAt = transfer.created_at,
    }
end

local function notify_transfer(transfer)
    TriggerClientEvent("sky_phone:easyshare:changed", transfer.sender_source, {
        transfer = transfer_for_source(transfer, transfer.sender_source),
    })
    TriggerClientEvent("sky_phone:easyshare:changed", transfer.recipient_source, {
        transfer = transfer_for_source(transfer, transfer.recipient_source),
    })
end

local function persist_state(transfer)
    Bridge.Database.Query([[ 
        UPDATE `sky_phone_easyshare_transfers`
        SET `status` = ?, `progress` = ?, `updated_at` = CURRENT_TIMESTAMP,
            `completed_at` = IF(? IN ('completed','declined','cancelled','expired','failed'), CURRENT_TIMESTAMP, `completed_at`)
        WHERE `id` = ?
    ]], { transfer.status, transfer.progress, transfer.status, transfer.id })
end

local function finish_transfer(transfer, status)
    if transfer.status ~= "pending" and transfer.status ~= "transferring" then
        return
    end
    transfer.status = status
    transfer.progress = status == "completed" and 100 or transfer.progress
    persist_state(transfer)
    notify_transfer(transfer)
    active_transfers[transfer.id] = nil
end

local function apply_received_payload(transfer)
    local device = SkyPhone.LoadDevice(transfer.recipient_imei)
    if not device then
        return false
    end
    local account_id = device.account_id and tonumber(device.account_id) or nil
    local meta = transfer.payload.meta or {}
    if transfer.payload.kind == "contact" then
        Bridge.Database.Query([[ 
            INSERT INTO `sky_phone_contacts`
                (`id`, `contact_id`, `account_id`, `device_imei`, `name`, `notes`, `organization`, `phone_number`)
            VALUES (?, ?, ?, ?, ?, NULLIF(?, ''), NULLIF(?, ''), ?)
        ]], {
            uuid(), uuid(), account_id, account_id and nil or device.imei,
            meta.name, meta.notes or "", meta.organization or "", meta.phoneNumber,
        })
        TriggerClientEvent("sky_phone:contacts:changed", transfer.recipient_source, {})
    elseif transfer.payload.kind == "note" then
        Bridge.Database.Query([[ 
            INSERT INTO `sky_phone_notes`
                (`id`, `account_id`, `device_imei`, `title`, `body`, `pinned`)
            VALUES (?, ?, ?, ?, ?, 0)
        ]], { uuid(), account_id, account_id and nil or device.imei, meta.title or "", meta.body or "" })
        if account_id then
            SkyPhone.RefreshAccount(account_id)
        else
            SkyPhone.RefreshDevice(device.imei)
        end
    elseif transfer.payload.kind == "location" then
        Bridge.Database.Query([[ 
            INSERT INTO `sky_phone_map_markers`
                (`id`, `device_imei`, `label`, `color`, `position_x`, `position_y`, `position_z`)
            VALUES (?, ?, ?, 'blue', ?, ?, ?)
        ]], { uuid(), device.imei, transfer.payload.title:sub(1, 40), meta.x, meta.y, meta.z })
    elseif transfer.payload.kind == "photo" or transfer.payload.kind == "video" then
        Bridge.Database.Query([[ 
            INSERT INTO `sky_phone_media` (`account_id`, `device_imei`, `url`, `remote_id`, `media_type`)
            VALUES (?, ?, ?, ?, ?)
        ]], {
            account_id, account_id and nil or device.imei, meta.url, meta.remoteId, transfer.payload.kind,
        })
        TriggerClientEvent("sky_phone:gallery:changed", transfer.recipient_source, {})
    end
    return true
end

local function advance_transfer(id)
    local transfer = active_transfers[id]
    if not transfer or transfer.status ~= "transferring" then
        return
    end
    local distance = distance_between(transfer.sender_source, transfer.recipient_source)
    if not distance or distance > Config.EasyShare.MaximumDistance then
        finish_transfer(transfer, "failed")
        return
    end
    transfer.progress = math.min(100, transfer.progress + 10)
    persist_state(transfer)
    notify_transfer(transfer)
    if transfer.progress >= 100 then
        if apply_received_payload(transfer) then
            finish_transfer(transfer, "completed")
        else
            finish_transfer(transfer, "failed")
        end
        return
    end
    SetTimeout(math.max(100, math.floor(Config.EasyShare.TransferDurationMs / 10)), function()
        advance_transfer(id)
    end)
end

local function row_transfer(row, current_imei)
    local decoded = json.decode(row.payload)
    return {
        id = row.id,
        direction = row.recipient_imei == current_imei and "incoming" or "outgoing",
        otherName = row.recipient_imei == current_imei and row.sender_name or row.recipient_name,
        payload = decoded,
        progress = tonumber(row.progress) or 0,
        status = row.status,
        createdAt = (tonumber(row.created_at_unix) or 0) * 1000,
    }
end

local function history(device)
    local rows = Bridge.Database.Query([[ 
        SELECT `id`, `sender_imei`, `recipient_imei`, `sender_name`, `recipient_name`,
            `payload`, `status`, `progress`, UNIX_TIMESTAMP(`created_at`) AS `created_at_unix`
        FROM `sky_phone_easyshare_transfers`
        WHERE `sender_imei` = ? OR `recipient_imei` = ?
        ORDER BY `created_at` DESC LIMIT ?
    ]], { device.imei, device.imei, Config.EasyShare.HistoryLimit })
    local result = {}
    for index, row in ipairs(rows) do
        result[index] = row_transfer(row, device.imei)
    end
    return result
end

Bridge.Callbacks.Register("sky_phone:easyshare:bootstrap", function(source)
    if not Config.EasyShare.Enabled then
        return { success = false, error = "disabled" }
    end
    local device, error_response = current_device(source)
    if not device then
        return error_response
    end
    local pending = {}
    for _, transfer in pairs(active_transfers) do
        if transfer.sender_source == source or transfer.recipient_source == source then
            pending[#pending + 1] = transfer_for_source(transfer, source)
        end
    end
    return {
        success = true,
        data = {
            history = history(device),
            pending = pending,
            targets = nearby_targets(source, device),
            visibility = visibility_for(device.imei),
        },
    }
end)

Bridge.Callbacks.Register("sky_phone:easyshare:set-visibility", function(source, data)
    local device, error_response = current_device(source)
    if not device then
        return error_response
    end
    local visibility = type(data) == "table" and data.visibility or nil
    if not valid_visibilities[visibility] then
        return { success = false, error = "invalid_visibility" }
    end
    Bridge.Database.Query([[ 
        INSERT INTO `sky_phone_easyshare_preferences` (`device_imei`, `visibility`)
        VALUES (?, ?) ON DUPLICATE KEY UPDATE `visibility` = VALUES(`visibility`)
    ]], { device.imei, visibility })
    return { success = true, data = { visibility = visibility } }
end)

Bridge.Callbacks.Register("sky_phone:easyshare:request", function(source, data)
    if not SkyPhone.AllowOperation(source, "easyshare_request", Config.EasyShare.RequestsPerMinute, 60) then
        return { success = false, error = "rate_limited" }
    end
    local sender_device, error_response = current_device(source)
    if not sender_device then
        return error_response
    end
    local target_source = type(data) == "table" and tonumber(data.targetId) or nil
    if not target_source or target_source ~= math.floor(target_source) then
        return { success = false, error = "invalid_target" }
    end
    local target = target_state(source, target_source, sender_device)
    if not target then
        return { success = false, error = "target_unavailable" }
    end
    local payload, payload_error, encoded = sanitize_payload(source, sender_device, data.payload)
    if not payload then
        return { success = false, error = payload_error }
    end
    local id = uuid()
    local transfer = {
        id = id,
        sender_source = source,
        recipient_source = target_source,
        sender_imei = sender_device.imei,
        recipient_imei = target.device.imei,
        sender_name = display_name(source),
        recipient_name = display_name(target_source),
        payload = payload,
        progress = 0,
        status = "pending",
        created_at = os.time() * 1000,
    }
    Bridge.Database.Query([[ 
        INSERT INTO `sky_phone_easyshare_transfers`
            (`id`, `sender_imei`, `recipient_imei`, `sender_name`, `recipient_name`, `content_type`, `payload`, `status`, `progress`)
        VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', 0)
    ]], { id, sender_device.imei, target.device.imei, transfer.sender_name, transfer.recipient_name, payload.kind, encoded })
    active_transfers[id] = transfer
    notify_transfer(transfer)
    SetTimeout(Config.EasyShare.PendingSeconds * 1000, function()
        local current = active_transfers[id]
        if current and current.status == "pending" then
            finish_transfer(current, "expired")
        end
    end)
    return { success = true, data = transfer_for_source(transfer, source) }
end)

Bridge.Callbacks.Register("sky_phone:easyshare:respond", function(source, data)
    local id = type(data) == "table" and data.id or nil
    local transfer = type(id) == "string" and active_transfers[id] or nil
    if not transfer or transfer.recipient_source ~= source or transfer.status ~= "pending" or type(data.accepted) ~= "boolean" then
        return { success = false, error = "transfer_not_found" }
    end
    if not data.accepted then
        finish_transfer(transfer, "declined")
        return { success = true, data = transfer_for_source(transfer, source) }
    end
    local distance = distance_between(transfer.sender_source, transfer.recipient_source)
    if not distance or distance > Config.EasyShare.MaximumDistance then
        finish_transfer(transfer, "failed")
        return { success = false, error = "too_far" }
    end
    transfer.status = "transferring"
    persist_state(transfer)
    notify_transfer(transfer)
    SetTimeout(math.max(100, math.floor(Config.EasyShare.TransferDurationMs / 10)), function()
        advance_transfer(id)
    end)
    return { success = true, data = transfer_for_source(transfer, source) }
end)

Bridge.Callbacks.Register("sky_phone:easyshare:cancel", function(source, data)
    local id = type(data) == "table" and data.id or nil
    local transfer = type(id) == "string" and active_transfers[id] or nil
    if not transfer or (transfer.sender_source ~= source and transfer.recipient_source ~= source) then
        return { success = false, error = "transfer_not_found" }
    end
    finish_transfer(transfer, "cancelled")
    return { success = true, data = transfer_for_source(transfer, source) }
end)

AddEventHandler("playerDropped", function()
    local dropped_source = source
    for _, transfer in pairs(active_transfers) do
        if transfer.sender_source == dropped_source or transfer.recipient_source == dropped_source then
            finish_transfer(transfer, "failed")
        end
    end
end)
end)
