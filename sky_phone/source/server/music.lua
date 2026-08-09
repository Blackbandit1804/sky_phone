Bridge.Database.AfterMigration("sky_phone", function()
local server_tracks = {}
local server_tracks_by_id = {}
local music_asset_prefix = "config/music/"
local audio_extensions = { mp3 = true, ogg = true }
local artwork_extensions = { jpeg = true, jpg = true, png = true, webp = true }

local function trim(value)
    return type(value) == "string" and value:match("^%s*(.-)%s*$") or nil
end

local function text_length(value)
    return type(value) == "string" and utf8.len(value) or nil
end

local function truncate_text(value, maximum)
    local length = text_length(value)
    if not length or length <= maximum then
        return value
    end
    local boundary = utf8.offset(value, maximum + 1)
    return boundary and value:sub(1, boundary - 1) or value
end

local function optional_text(value)
    local normalized = trim(value)
    return normalized ~= "" and normalized or nil
end

local function normalize_music_asset_path(value, allowed_extensions)
    local path = trim(value)
    if not path
        or path:sub(1, #music_asset_prefix) ~= music_asset_prefix
        or not path:match("^[%w%._%-%/]+$")
        or path:find("..", 1, true)
        or path:find("//", 1, true)
        or path:find("\\", 1, true)
    then
        return nil
    end

    local extension = path:match("%.([%w]+)$")
    if not extension or not allowed_extensions[extension:lower()] then
        return nil
    end
    return path
end

local function music_asset_url(path)
    return ("https://cfx-nui-%s/%s"):format(GetCurrentResourceName(), path)
end

local function affected_rows(result)
    if type(result) == "number" then
        return result
    end
    return type(result) == "table" and tonumber(result.affectedRows) or 0
end

local function uuid()
    local rows = Bridge.Database.Query("SELECT UUID() AS `id`", {})
    local id = rows[1] and rows[1].id
    if type(id) ~= "string" then
        error("[sky_phone] Database did not generate a music id.")
    end
    return id
end

local function normalize_server_tracks()
    for index, configured in ipairs(Config.Music.Tracks or {}) do
        local id = trim(configured.Id)
        local title = trim(configured.Title)
        local artist = trim(configured.Artist)
        local title_length = text_length(title)
        local artist_length = text_length(artist)
        local file = normalize_music_asset_path(configured.File, audio_extensions)
        local configured_artwork = optional_text(configured.Artwork)
        local artwork = configured_artwork
            and normalize_music_asset_path(configured_artwork, artwork_extensions)
            or nil

        if not id
            or not id:match("^[%w%-_]+$")
            or #id > 48
            or not title_length
            or title_length < 1
            or title_length > 160
            or not artist_length
            or artist_length < 1
            or artist_length > 120
            or not file
            or (configured_artwork and not artwork)
            or server_tracks_by_id[id]
        then
            Bridge.Debug(
                "error",
                "[sky_phone] Ignored invalid or duplicate Config.Music.Tracks entry at index %s.",
                tostring(index),
                { always = true }
            )
        else
            local track = {
                id = id,
                source = "server",
                title = title,
                artist = artist,
                url = music_asset_url(file),
                artwork = artwork and music_asset_url(artwork) or nil,
            }
            server_tracks[#server_tracks + 1] = track
            server_tracks_by_id[id] = track
        end
    end
end

normalize_server_tracks()

local function session_owner(source)
    local session, error_response = SkyPhone.RequireSession(source)
    if not session then
        return nil, nil, error_response
    end
    local account = SkyPhone.RequireAccount(source)
    return account and account.id or nil, session.imei
end

local function owner_condition(account_id, imei, alias)
    local prefix = alias and ("`" .. alias .. "`.") or ""
    if account_id then
        return prefix .. "`account_id` = ?", { account_id }
    end
    return prefix .. "`account_id` IS NULL AND " .. prefix .. "`device_imei` = ?", { imei }
end

local function append_params(target, values)
    for _, value in ipairs(values) do
        target[#target + 1] = value
    end
end

local function youtube_track_dto(row)
    local video_id = row.video_id
    return {
        id = row.id,
        source = "youtube",
        videoId = video_id,
        title = row.title,
        artist = row.artist,
        artwork = "https://i.ytimg.com/vi/" .. video_id .. "/hqdefault.jpg",
        createdAt = (tonumber(row.created_at_unix) or 0) * 1000,
    }
end

local function list_youtube_tracks(account_id, imei)
    local condition, params = owner_condition(account_id, imei)
    local rows = Bridge.Database.Query(([[
        SELECT `id`, `video_id`, `title`, `artist`,
            UNIX_TIMESTAMP(`created_at`) AS `created_at_unix`
        FROM `sky_phone_music_youtube_songs`
        WHERE %s
        ORDER BY `created_at` DESC, `id`
    ]]):format(condition), params)
    local tracks = {}
    for index, row in ipairs(rows) do
        tracks[index] = youtube_track_dto(row)
    end
    return tracks
end

local function list_playlists(account_id, imei)
    local condition, params = owner_condition(account_id, imei)
    local rows = Bridge.Database.Query(([[
        SELECT `id`, `name`, UNIX_TIMESTAMP(`created_at`) AS `created_at_unix`
        FROM `sky_phone_music_playlists`
        WHERE %s
        ORDER BY `updated_at` DESC, `created_at` DESC
    ]]):format(condition), params)
    local playlists = {}
    local playlists_by_id = {}
    for index, row in ipairs(rows) do
        local playlist = {
            id = row.id,
            name = row.name,
            entries = {},
            createdAt = (tonumber(row.created_at_unix) or 0) * 1000,
        }
        playlists[index] = playlist
        playlists_by_id[row.id] = playlist
    end

    if #rows == 0 then
        return playlists
    end

    local item_condition, item_params = owner_condition(account_id, imei, "p")
    local items = Bridge.Database.Query(([[
        SELECT `i`.`playlist_id`, `i`.`source`, `i`.`song_id`
        FROM `sky_phone_music_playlist_items` AS `i`
        INNER JOIN `sky_phone_music_playlists` AS `p` ON `p`.`id` = `i`.`playlist_id`
        WHERE %s
        ORDER BY `i`.`position`, `i`.`id`
    ]]):format(item_condition), item_params)
    for _, item in ipairs(items) do
        local playlist = playlists_by_id[item.playlist_id]
        if playlist then
            playlist.entries[#playlist.entries + 1] = {
                source = item.source,
                songId = item.song_id,
            }
        end
    end
    return playlists
end

local function bootstrap(account_id, imei)
    return {
        serverTracks = server_tracks,
        youtubeTracks = list_youtube_tracks(account_id, imei),
        playlists = list_playlists(account_id, imei),
    }
end

local function parse_youtube_id(value)
    if type(value) ~= "string" or #value > 500 then
        return nil
    end
    local host, path = value:match("^https?://([^/]+)(/.*)$")
    if not host or not path then
        return nil
    end
    host = host:lower():gsub(":443$", "")
    local id
    if host == "youtu.be" or host == "www.youtu.be" then
        id = path:match("^/([%w_-]+)")
    elseif host == "youtube.com"
        or host == "www.youtube.com"
        or host == "m.youtube.com"
        or host == "music.youtube.com"
        or host == "youtube-nocookie.com"
        or host == "www.youtube-nocookie.com"
    then
        id = path:match("[?&]v=([%w_-]+)")
            or path:match("^/shorts/([%w_-]+)")
            or path:match("^/embed/([%w_-]+)")
            or path:match("^/live/([%w_-]+)")
    end
    return id and #id == 11 and id or nil
end

local function fetch_youtube_metadata(video_id)
    local request = promise.new()
    local settled = false
    local function resolve(value)
        if settled then
            return
        end
        settled = true
        request:resolve(value)
    end

    PerformHttpRequest(
        "https://www.youtube.com/oembed?format=json&url=https://www.youtube.com/watch?v=" .. video_id,
        function(status, body)
            if status ~= 200 or type(body) ~= "string" then
                resolve(nil)
                return
            end
            local success, decoded = pcall(json.decode, body)
            if not success or type(decoded) ~= "table" then
                resolve(nil)
                return
            end
            local title = trim(decoded.title)
            local artist = trim(decoded.author_name)
            if not text_length(title) or not text_length(artist) then
                resolve(nil)
                return
            end
            resolve({
                title = truncate_text(title, 160),
                artist = truncate_text(artist, 120),
            })
        end,
        "GET",
        "",
        { ["Accept"] = "application/json" }
    )

    SetTimeout(Config.Music.MetadataTimeoutMs, function()
        resolve(nil)
    end)
    return Citizen.Await(request)
end

local function owned_playlist(account_id, imei, playlist_id)
    local condition, owner_params = owner_condition(account_id, imei)
    local params = { playlist_id }
    append_params(params, owner_params)
    local rows = Bridge.Database.Query(([[
        SELECT `id` FROM `sky_phone_music_playlists`
        WHERE `id` = ? AND %s LIMIT 1
    ]]):format(condition), params)
    return rows[1] ~= nil
end

local function valid_personal_song(account_id, imei, song_id)
    local condition, owner_params = owner_condition(account_id, imei)
    local params = { song_id }
    append_params(params, owner_params)
    local rows = Bridge.Database.Query(([[
        SELECT `id` FROM `sky_phone_music_youtube_songs`
        WHERE `id` = ? AND %s LIMIT 1
    ]]):format(condition), params)
    return rows[1] ~= nil
end

Bridge.Callbacks.Register("sky_phone:music:bootstrap", function(source)
    local account_id, imei, error_response = session_owner(source)
    if not imei then
        return error_response
    end
    return { success = true, data = bootstrap(account_id, imei) }
end)

Bridge.Callbacks.Register("sky_phone:music:add-youtube", function(source, data)
    if not SkyPhone.AllowOperation(source, "music_write", Config.Music.ActionsPerMinute, 60) then
        return { success = false, error = "rate_limited" }
    end
    local account_id, imei, error_response = session_owner(source)
    if not imei then
        return error_response
    end
    local payload = type(data) == "table" and data or {}
    local video_id = parse_youtube_id(payload.url)
    if not video_id then
        return { success = false, error = "invalid_youtube_url" }
    end
    local custom_title = optional_text(payload.title)
    local custom_artist = optional_text(payload.artist)
    local custom_title_length = text_length(custom_title)
    local custom_artist_length = text_length(custom_artist)
    if (custom_title and (not custom_title_length or custom_title_length > 160))
        or (custom_artist and (not custom_artist_length or custom_artist_length > 120))
    then
        return { success = false, error = "invalid_song_metadata" }
    end

    local condition, owner_params = owner_condition(account_id, imei)
    local duplicate_params = { video_id }
    append_params(duplicate_params, owner_params)
    local duplicate = Bridge.Database.Query(([[
        SELECT `id` FROM `sky_phone_music_youtube_songs`
        WHERE `video_id` = ? AND %s LIMIT 1
    ]]):format(condition), duplicate_params)
    if duplicate[1] then
        return { success = false, error = "song_exists" }
    end
    local count_rows = Bridge.Database.Query(([[
        SELECT COUNT(*) AS `count` FROM `sky_phone_music_youtube_songs` WHERE %s
    ]]):format(condition), owner_params)
    if (tonumber(count_rows[1] and count_rows[1].count) or 0) >= Config.Music.MaximumPersonalSongs then
        return { success = false, error = "song_limit" }
    end

    local metadata = (not custom_title or not custom_artist)
        and fetch_youtube_metadata(video_id)
        or nil
    local title = custom_title or metadata and metadata.title or "YouTube " .. video_id
    local artist = custom_artist or metadata and metadata.artist or "YouTube"
    local id = uuid()
    if account_id then
        Bridge.Database.Query([[
            INSERT INTO `sky_phone_music_youtube_songs`
                (`id`, `account_id`, `device_imei`, `video_id`, `title`, `artist`)
            VALUES (?, ?, NULL, ?, ?, ?)
        ]], { id, account_id, video_id, title, artist })
    else
        Bridge.Database.Query([[
            INSERT INTO `sky_phone_music_youtube_songs`
                (`id`, `account_id`, `device_imei`, `video_id`, `title`, `artist`)
            VALUES (?, NULL, ?, ?, ?, ?)
        ]], { id, imei, video_id, title, artist })
    end
    return { success = true, data = bootstrap(account_id, imei) }
end)

Bridge.Callbacks.Register("sky_phone:music:remove-youtube", function(source, data)
    if not SkyPhone.AllowOperation(source, "music_write", Config.Music.ActionsPerMinute, 60) then
        return { success = false, error = "rate_limited" }
    end
    local account_id, imei, error_response = session_owner(source)
    if not imei then
        return error_response
    end
    local song_id = type(data) == "table" and data.id or nil
    if type(song_id) ~= "string" or not valid_personal_song(account_id, imei, song_id) then
        return { success = false, error = "song_not_found" }
    end

    local condition, owner_params = owner_condition(account_id, imei, "p")
    local item_params = { song_id }
    append_params(item_params, owner_params)
    Bridge.Database.Query(([[
        DELETE `i` FROM `sky_phone_music_playlist_items` AS `i`
        INNER JOIN `sky_phone_music_playlists` AS `p` ON `p`.`id` = `i`.`playlist_id`
        WHERE `i`.`source` = 'youtube' AND `i`.`song_id` = ? AND %s
    ]]):format(condition), item_params)

    local song_condition, song_owner_params = owner_condition(account_id, imei)
    local delete_params = { song_id }
    append_params(delete_params, song_owner_params)
    Bridge.Database.Query(([[
        DELETE FROM `sky_phone_music_youtube_songs` WHERE `id` = ? AND %s
    ]]):format(song_condition), delete_params)
    return { success = true, data = bootstrap(account_id, imei) }
end)

Bridge.Callbacks.Register("sky_phone:music:create-playlist", function(source, data)
    if not SkyPhone.AllowOperation(source, "music_write", Config.Music.ActionsPerMinute, 60) then
        return { success = false, error = "rate_limited" }
    end
    local account_id, imei, error_response = session_owner(source)
    if not imei then
        return error_response
    end
    local name = trim(type(data) == "table" and data.name or nil)
    local name_length = text_length(name)
    if not name_length or name_length < 1 or name_length > Config.Music.PlaylistNameMaxLength then
        return { success = false, error = "invalid_playlist" }
    end

    local condition, owner_params = owner_condition(account_id, imei)
    local count_rows = Bridge.Database.Query(([[
        SELECT COUNT(*) AS `count` FROM `sky_phone_music_playlists` WHERE %s
    ]]):format(condition), owner_params)
    if (tonumber(count_rows[1] and count_rows[1].count) or 0) >= Config.Music.MaximumPlaylists then
        return { success = false, error = "playlist_limit" }
    end

    local id = uuid()
    if account_id then
        Bridge.Database.Query([[
            INSERT INTO `sky_phone_music_playlists` (`id`, `account_id`, `device_imei`, `name`)
            VALUES (?, ?, NULL, ?)
        ]], { id, account_id, name })
    else
        Bridge.Database.Query([[
            INSERT INTO `sky_phone_music_playlists` (`id`, `account_id`, `device_imei`, `name`)
            VALUES (?, NULL, ?, ?)
        ]], { id, imei, name })
    end
    return { success = true, data = bootstrap(account_id, imei) }
end)

Bridge.Callbacks.Register("sky_phone:music:rename-playlist", function(source, data)
    if not SkyPhone.AllowOperation(source, "music_write", Config.Music.ActionsPerMinute, 60) then
        return { success = false, error = "rate_limited" }
    end
    local account_id, imei, error_response = session_owner(source)
    if not imei then
        return error_response
    end
    local playlist_id = type(data) == "table" and data.id or nil
    local name = trim(type(data) == "table" and data.name or nil)
    local name_length = text_length(name)
    if type(playlist_id) ~= "string"
        or not name_length
        or name_length < 1
        or name_length > Config.Music.PlaylistNameMaxLength
    then
        return { success = false, error = "invalid_playlist" }
    end

    if not owned_playlist(account_id, imei, playlist_id) then
        return { success = false, error = "playlist_not_found" }
    end
    local condition, owner_params = owner_condition(account_id, imei)
    local params = { name, playlist_id }
    append_params(params, owner_params)
    Bridge.Database.Query(([[
        UPDATE `sky_phone_music_playlists` SET `name` = ?
        WHERE `id` = ? AND %s
    ]]):format(condition), params)
    return { success = true, data = bootstrap(account_id, imei) }
end)

Bridge.Callbacks.Register("sky_phone:music:delete-playlist", function(source, data)
    if not SkyPhone.AllowOperation(source, "music_write", Config.Music.ActionsPerMinute, 60) then
        return { success = false, error = "rate_limited" }
    end
    local account_id, imei, error_response = session_owner(source)
    if not imei then
        return error_response
    end
    local playlist_id = type(data) == "table" and data.id or nil
    if type(playlist_id) ~= "string" then
        return { success = false, error = "invalid_playlist" }
    end
    local condition, owner_params = owner_condition(account_id, imei)
    local params = { playlist_id }
    append_params(params, owner_params)
    local result = Bridge.Database.Query(([[
        DELETE FROM `sky_phone_music_playlists` WHERE `id` = ? AND %s
    ]]):format(condition), params)
    if affected_rows(result) ~= 1 then
        return { success = false, error = "playlist_not_found" }
    end
    return { success = true, data = bootstrap(account_id, imei) }
end)

Bridge.Callbacks.Register("sky_phone:music:add-to-playlist", function(source, data)
    if not SkyPhone.AllowOperation(source, "music_write", Config.Music.ActionsPerMinute, 60) then
        return { success = false, error = "rate_limited" }
    end
    local account_id, imei, error_response = session_owner(source)
    if not imei then
        return error_response
    end
    local playlist_id = type(data) == "table" and data.playlistId or nil
    local source_type = type(data) == "table" and data.source or nil
    local song_id = type(data) == "table" and data.songId or nil
    if type(playlist_id) ~= "string"
        or type(song_id) ~= "string"
        or not owned_playlist(account_id, imei, playlist_id)
        or (source_type ~= "server" and source_type ~= "youtube")
        or (source_type == "server" and not server_tracks_by_id[song_id])
        or (source_type == "youtube" and not valid_personal_song(account_id, imei, song_id))
    then
        return { success = false, error = "invalid_song" }
    end

    local counts = Bridge.Database.Query([[
        SELECT COUNT(*) AS `count`, COALESCE(MAX(`position`), 0) AS `last_position`
        FROM `sky_phone_music_playlist_items` WHERE `playlist_id` = ?
    ]], { playlist_id })
    if (tonumber(counts[1] and counts[1].count) or 0) >= Config.Music.MaximumPlaylistSongs then
        return { success = false, error = "playlist_song_limit" }
    end
    Bridge.Database.Query([[
        INSERT IGNORE INTO `sky_phone_music_playlist_items`
            (`playlist_id`, `source`, `song_id`, `position`)
        VALUES (?, ?, ?, ?)
    ]], {
        playlist_id,
        source_type,
        song_id,
        (tonumber(counts[1] and counts[1].last_position) or 0) + 1,
    })
    Bridge.Database.Query(
        "UPDATE `sky_phone_music_playlists` SET `updated_at` = CURRENT_TIMESTAMP WHERE `id` = ?",
        { playlist_id }
    )
    return { success = true, data = bootstrap(account_id, imei) }
end)

Bridge.Callbacks.Register("sky_phone:music:remove-from-playlist", function(source, data)
    if not SkyPhone.AllowOperation(source, "music_write", Config.Music.ActionsPerMinute, 60) then
        return { success = false, error = "rate_limited" }
    end
    local account_id, imei, error_response = session_owner(source)
    if not imei then
        return error_response
    end
    local playlist_id = type(data) == "table" and data.playlistId or nil
    local source_type = type(data) == "table" and data.source or nil
    local song_id = type(data) == "table" and data.songId or nil
    if type(playlist_id) ~= "string"
        or type(song_id) ~= "string"
        or (source_type ~= "server" and source_type ~= "youtube")
        or not owned_playlist(account_id, imei, playlist_id)
    then
        return { success = false, error = "invalid_song" }
    end
    Bridge.Database.Query([[
        DELETE FROM `sky_phone_music_playlist_items`
        WHERE `playlist_id` = ? AND `source` = ? AND `song_id` = ?
    ]], { playlist_id, source_type, song_id })
    return { success = true, data = bootstrap(account_id, imei) }
end)
end)
