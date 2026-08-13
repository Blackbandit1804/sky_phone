local overhead_members = {}
local overhead_expires_at = 0

local function draw_overhead_label(coords, username, role)
    SetDrawOrigin(coords.x, coords.y, coords.z + 1.05, 0)
    SetTextScale(0.0, 0.29)
    SetTextFont(4)
    SetTextProportional(true)
    SetTextColour(235, 245, 255, 235)
    SetTextCentre(true)
    SetTextOutline()
    BeginTextCommandDisplayText("STRING")
    AddTextComponentSubstringPlayerName(("~b~%s~s~  %s"):format(username, role))
    EndTextCommandDisplayText(0.0, 0.0)
    ClearDrawOrigin()
end

RegisterNUICallback("crewlink:live", function(data, cb)
    if type(data) ~= "table" then
        cb({ success = false, error = "invalid_request" })
        return
    end
    local result = Bridge.Callbacks.Trigger("sky_phone:crewlink:live", data)
    overhead_members = result and result.success and result.data and result.data.overheadMembers or {}
    overhead_expires_at = GetGameTimer() + Config.CrewLink.OverheadRefreshMilliseconds * 2
    cb(result or { success = false, error = "request_failed" })
end)

AddEventHandler("sky_phone:nuiClosed", function()
    overhead_members = {}
    overhead_expires_at = 0
end)

CreateThread(function()
    while true do
        local sleep = 1000
        if overhead_expires_at > 0 and GetGameTimer() >= overhead_expires_at then
            overhead_members = {}
            overhead_expires_at = 0
        end
        if #overhead_members > 0 then
            sleep = 0
            local player_coords = GetEntityCoords(PlayerPedId())
            for _, member in ipairs(overhead_members) do
                local player = GetPlayerFromServerId(member.source)
                if player ~= -1 then
                    local ped = GetPlayerPed(player)
                    local coords = GetEntityCoords(ped)
                    if #(player_coords - coords) <= Config.CrewLink.OverheadDistance then
                        draw_overhead_label(coords, member.username, member.roleLabel)
                    end
                end
            end
        end
        Wait(sleep)
    end
end)
