local overhead_members = {}

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

CreateThread(function()
    while true do
        local result = Bridge.Callbacks.Trigger("sky_phone:crewlink:overhead", {})
        overhead_members = result and result.success and result.data and result.data.members or {}
        Wait(Config.CrewLink.OverheadRefreshMilliseconds)
    end
end)

CreateThread(function()
    while true do
        local sleep = 1000
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
