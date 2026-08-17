--[[
    Sky Phone configuration

    General settings live in this file. Media providers and upload limits live
    in config/media.lua, while translations remain in config/locales/*.lua.
    Sections marked "SERVER ONLY" are guarded with IsDuplicityVersion(), so
    passwords, API keys, migration settings, and server-owned locations are not
    applied by game clients.

    Keep option names unchanged. Restart sky_phone after editing this file.
]]

-- =============================================================================
-- Core, framework and device
-- =============================================================================

Config.Bridge = {
    Framework = "auto", -- auto, esx, qbox, qb
    Inventory = "auto", -- auto, ox, qb, lj, qs, codem, core, mf, smx
    Locale = "en",
    CallbackTimeout = 15000,
    Debug = false, -- true: show debug/info output; warnings and errors are always shown
}

Config.Command = "phone"

Config.Phone = {
    Item = "phone",
    Unique = true, -- true: data follows each phone item; false: one persistent phone per character
    AllowMovement = true, -- true: game input stays active while the mobile phone is open
    DevelopmentCommand = true,
    DeviceName = "iFruit Phone",
}

Config.TestData = {
    Enabled = true,
    Command = "phonetestdata",
    AdminOnly = false, -- enable only on development servers; every run is scoped to the executing player's phone
    AdminGroups = { "admin", "superadmin" },
}

Config.CustomApps = {
    Enabled = true,
    BundledApps = true,
    ExternalApps = true,
    ReadyTimeoutMs = 8000,
    MaximumMessageBytes = 65536,
    MaximumStorageBytesPerApp = 262144,
    MaximumStorageValueBytes = 65536, -- Bridge v1 ceiling; lower values tighten the server policy.
    MaximumStorageKeyLength = 64, -- Bridge v1 ceiling; lower values tighten the server policy.
    MaximumStorageKeysPerApp = 128,
    StorageRequestsPerMinute = 120,
    AllowRemoteOrigins = {
        -- ["https://apps.example.com"] = true,
    },
    TrustedAdapters = {},
}

Config.Security = {
    MaximumAttempts = 5,
    LockSeconds = 30,
    AttemptsPerMinute = 12,
}

Config.Sim = {
    Enabled = true, -- false: devices without a SIM receive a persistent random number automatically
    RegisteredItem = "sky_phone_sim_registered",
    AnonymousItem = "sky_phone_sim_anonymous",
    NumberLength = 10,
    NumberPrefix = "",
    NumberGroups = { 3, 3, 4 },
}

-- =============================================================================
-- Calls, voice and radio
-- =============================================================================

Config.Speaker = {
    Enabled = true, -- global phone and radio speaker controls
}

Config.Calls = {
    VoiceProvider = "pma", -- pma (alias: pma-voice), saltychat (alias: salty)
    RingSeconds = 30,
    ContactNameMaxLength = 80,
    ContactNotesMaxLength = 500,
    RecentPageSize = 100,
}

Config.Payphones = {
    Enabled = true,
    Props = {
        "prop_phonebox_01b",
        "p_phonebox_01b_s",
        "prop_phonebox_01a",
        "prop_phonebox_04",
    },
    ReplacementProp = "sf_prop_sf_phonebox_01b_s",
    PricePerSecond = 1,
    PaymentAccount = "cash", -- cash or bank
    Currency = "$",
    NoAnswerTimeoutSeconds = 30,
    CallerNumber = "PAYPHONE",
    InteractionDistance = 1.8,
    ServerValidationDistance = 3.0,
    MaximumCallDistance = 4.0,
    ScanDistance = 25.0,
    ScanIntervalMs = 1000,
    ModelLoadTimeoutMs = 5000,
    Animation = {
        Dictionary = "anim@scripted@payphone_hits@male@",
        PedClip = "FXFR_PAV_1_INTRO_MALE",
        PropClip = "FXFR_PAV_1_INTRO_PHONE",
        HangupDurationMs = 2000,
    },
}

Config.Radio = {
    VoiceProvider = "auto", -- auto, yaca, pma, saltychat
    DefaultVolume = 50,
    HistoryLimit = 8,
    FrequencyMin = 0.1,
    FrequencyMax = 999.9,
    FrequencyDecimals = 1,
    AllowSecondary = true,
    Notifications = false,
    AutoRejoin = false,
    DisplayName = {
        Enabled = true,
        MaxLength = 32,
        AllowedJobs = { -- Job name = minimum grade. Unlisted jobs cannot set a radio display name.
            police = 0,
            sheriff = 0,
            fib = 0,
            army = 0,
            ambulance = 0,
        },
    },
    Hud = {
        Enabled = true,
        SpeakerPersistMilliseconds = 3000,
        Position = {
            Horizontal = "right", -- left or right
            Vertical = "top", -- top or bottom
            HorizontalOffset = 2.0, -- vh
            VerticalOffset = 30.0, -- vh
        },
    },
    Badge = {
        Enabled = true,
        MaxLength = 8,
        ForbiddenPatterns = { "88", "1488", "18", "14", "28", "198" },
    },
    LockedChannels = {
        {
            range = { 0.1, 100.0 },
            jobs = {
                police = true,
                sheriff = true,
                fib = true,
                army = true,
                ambulance = true,
            },
        },
    },
}

-- =============================================================================
-- Phone presentation and animations
-- =============================================================================

Config.Animations = {
    Enabled = true,
    PropModel = "prop_npc_phone_02",
    PropBone = 28422,
    LoadTimeoutMs = 5000,
    ContextPollMs = 250,
    Dictionaries = {
        OnFoot = "cellphone@",
        Driver = "anim@cellphone@in_car@ds",
        Passenger = "anim@cellphone@in_car@ps",
        Camera = "cellphone@self",
    },
    Clips = {
        TextIn = "cellphone_text_in",
        TextRead = "cellphone_text_read_base",
        TextOut = "cellphone_text_out",
        TextToCall = "cellphone_text_to_call",
        CallListen = "cellphone_call_listen_base",
        CallToText = "cellphone_call_to_text",
        CallOut = "cellphone_call_out",
        Camera = "selfie",
    },
    Transforms = {
        Portrait = {
            position = vector3(0.0, 0.0, 0.0),
            rotation = vector3(0.0, 0.0, 0.0),
        },
        Landscape = {
            position = vector3(0.0, 0.0, 0.0),
            rotation = vector3(0.0, 0.0, 90.0),
        },
    },
}

-- =============================================================================
-- Built-in applications
-- =============================================================================

Config.Messages = {
    BodyMaxLength = 2000,
    ConversationScanLimit = 1000,
    ThreadPageSize = 200,
    SendsPerMinute = 30,
    MediaLoadsPerMinute = 120,
    VoiceMaxDurationMs = 30000,
    VoiceMaxBase64Length = 180000,
    VoiceWaveformSamples = 48,
    VideoMaxDurationMs = 30000,
    DeleteBatchSize = 20,
}

Config.Memos = {
    MaximumCount = 100,
    MaximumDurationMs = 300000,
    MaximumBytes = 2 * 1024 * 1024,
    MaximumWaveformSamples = 96,
    TitleMaxLength = 120,
    NoteMaxLength = 2000,
    UploadsPerMinute = 10,
    WritesPerMinute = 60,
    ListsPerMinute = 60,
    MaximumPendingUploads = 1,
    UploadSessionTimeoutMs = 60000,
}

Config.EasyShare = {
    Enabled = true,
    DefaultVisibility = "everyone", -- everyone, contacts or hidden
    MaximumDistance = 15.0,
    HistoryLimit = 50,
    PendingSeconds = 30,
    TransferDurationMs = 3000,
    RequestsPerMinute = 12,
    BootstrapRequestsPerMinute = 30,
    VisibilityUpdatesPerMinute = 10,
    ActionsPerMinute = 30,
    PayloadMaxBytes = 24000,
}

Config.DarkChat = {
    AliasMaxLength = 32,
    BodyMaxLength = 2000,
    ThreadPageSize = 200,
    SendsPerMinute = 30,
    ActionsPerMinute = 60,
    ReportsPerDay = 10,
    VoiceMaxDurationMs = 60000,
    VoiceMaxBase64Length = 360000,
    VoiceWaveformSamples = 48,
    CleanupIntervalSeconds = 30,
    AllowedDisappearTimers = {
        [0] = true,
        [-1] = true, -- after reading
        [60] = true,
        [300] = true,
        [3600] = true,
        [86400] = true,
        [604800] = true,
    },
}

Config.Mail = {
    Domain = "ifruit.com",
    LocalPartMinLength = 3,
    LocalPartMaxLength = 32,
    PasswordMinLength = 6,
    PasswordMaxLength = 64,
    SubjectMaxLength = 120,
    BodyMaxLength = 20000,
    MaxRecipients = 10,
    PageSize = 50,
    AuthAttemptsPerMinute = 5,
    MailboxNameMaxLength = 50,
    MaxMailboxes = 20,
    MailboxRequestsPerMinute = 12,
    DeleteBatchSize = 50,
    DeleteRequestsPerMinute = 12,
}

Config.Banking = {
    Currency = "$",
    MinimumAmount = 1,
    MaximumAmount = 1000000,
    ActionsPerMinute = 12,
    HistoryLimit = 50,
}

Config.Health = {
    DailyStepGoal = 8000,
    SampleIntervalMs = 500,
    ReportIntervalSeconds = 30,
    ReportsPerMinute = 4,
    MaximumSpeedMetersPerSecond = 12.0,
    EmergencyNumber = "911",
    ProfileTextMaxLength = 500,
}

Config.Billing = {
    Enabled = true,
    Currency = "$",
    PaymentAccount = "bank", -- bank or cash
    MinimumAmount = 1,
    MaximumAmount = 1000000,
    PageSize = 30,
    UrgentLimit = 5,
    ActionsPerMinute = 8,
    AllowDisputes = true,
    DefaultDueDays = 7,
    MaximumTitleLength = 160,
    MaximumDescriptionLength = 1000,
}

Config.Garage = {
    System = "auto", -- auto, custom, esx, qb, qbox, ak47, bp, cd, codem, ds-servercreator, hex, jg, my, okok, op, quasar, rx, vms, ws, zyke_garages
    MaximumVehicles = 250,
    RequestsPerMinute = 30,
    VehicleImages = {
        Enabled = true,
        UrlTemplate = "https://cdn.sky-systems.net/vehicles/{model}.png",
        -- Optional spawn-name overrides for garages that only store model hashes.
        -- Example: [970598228] = "sultan",
        ModelNames = {},
    },
    Custom = {
        Table = "",
        OwnerColumn = "",
    },
    Valet = {
        Enabled = true,
        Price = 750,
        Account = "bank", -- bank or cash
        RequestsPerMinute = 3,
        CooldownSeconds = 60,
        TimeoutSeconds = 180,
        SpawnDistance = 110.0,
        ArrivalDistance = 14.0,
        DriveSpeed = 20.0,
        DrivingStyle = 786603,
        DriverModel = "s_m_m_autoshop_01",
        -- The current valet driver route supports road vehicles. Keep non-road types disabled.
        VehicleTypes = {
            car = true,
            bike = true,
            boat = false,
            plane = false,
            helicopter = false,
        },
    },
}

Config.Housing = {
    System = "auto", -- auto, esx_property, qbx_properties
    AutoPriority = { "esx_property", "qbx_properties" },
    MaximumProperties = 50,
    OverviewRequestsPerMinute = 30,
    ActionsPerMinute = 12,
    Camera = {
        HeightAboveEntrance = 2.5,
        FieldOfView = 55.0,
        MinimumFieldOfView = 20.0,
        MaximumFieldOfView = 75.0,
        RotateSpeed = 0.65,
        ExitControl = 177, -- Backspace
        NightVisionControl = 38, -- E
        ZoomInControl = 241, -- Mouse wheel up
        ZoomOutControl = 242, -- Mouse wheel down
        LeftControl = 174,
        RightControl = 175,
        UpControl = 172,
        DownControl = 173,
    },
}

Config.Marketplace = {
    PageSize = 20,
    MessagePageSize = 50,
    OfferHistorySize = 50,
    MaxActiveListings = 15,
    MaxImages = 6,
    TitleMinLength = 5,
    TitleMaxLength = 70,
    DescriptionMinLength = 20,
    DescriptionMaxLength = 2000,
    MessageMaxLength = 1000,
    MaximumPrice = 100000000,
    ListingLifetimeDays = 7,
    Categories = {
        "vehicles",
        "property",
        "electronics",
        "clothing",
        "tools",
        "leisure",
        "services",
        "jobs",
        "wanted",
        "other",
    },
    Districts = {
        "los_santos",
        "vinewood",
        "vespucci",
        "south_los_santos",
        "sandy_shores",
        "paleto_bay",
        "blaine_county",
    },
    PhotoGradients = {
        "linear-gradient(145deg, #ff9a62, #5f2c82 58%, #141e30)",
        "linear-gradient(160deg, #67d5b5, #26648e 55%, #0b132b)",
        "linear-gradient(135deg, #fbc2eb, #a6c1ee 48%, #302b63)",
        "linear-gradient(150deg, #f6d365, #fda085 45%, #512b58)",
        "linear-gradient(145deg, #ff6b6b, #845ec2 52%, #0f2027)",
        "linear-gradient(150deg, #00c9a7, #4d8076 46%, #1f3a5f)",
        "linear-gradient(135deg, #ffc75f, #f96d80 48%, #4b4453)",
    },
}

Config.LocalPages = {
    PageSize = 20,
    MaxImages = 6,
    ProfileHandleMinLength = 3,
    ProfileHandleMaxLength = 24,
    ProfileBioMaxLength = 160,
    TitleMinLength = 5,
    TitleMaxLength = 80,
    BodyMinLength = 10,
    BodyMaxLength = 1500,
    Categories = { "recommendation", "wanted", "service", "event", "place", "community" },
    CityMarktSharesPerDay = 1,
}

-- =============================================================================
-- Social applications
-- =============================================================================

Config.FlipTok = {
    PageSize = 12,
    CaptionMaxLength = 500,
    CommentMaxLength = 300,
    BioMaxLength = 160,
    PasswordMinLength = 8,
    PasswordMaxLength = 72,
    MaxVideoDurationMs = 300000,
    MaxPostMedia = 10,
    MusicTracks = {},
    VerifyCommand = "fliptokverify",
    AdminGroups = { "admin" },
    ReportWebhookConvar = "sky_phone_fliptok_report_webhook",
}

Config.Picstagram = {
    PageSize = 12,
    CommentPageSize = 100,
    MaxPostMedia = 5,
    CaptionMaxLength = 800,
    CommentMaxLength = 300,
    BioMaxLength = 160,
    LocationMaxLength = 80,
    StoryTextMaxLength = 160,
    StoryLifetimeSeconds = 24 * 60 * 60,
    PasswordMinLength = 8,
    PasswordMaxLength = 72,
    PostsPerMinute = 6,
    StoriesPerMinute = 6,
    CommentsPerMinute = 20,
    ReportDetailsMaxLength = 500,
    ReportReasons = { "spam", "harassment", "dangerous", "illegal", "other" },
    VerifyCommand = "picstagramverify",
    AdminGroups = { "admin" },
}

Config.Feather = {
    PageSize = 20,
    TextMaxLength = 360,
    BioMaxLength = 160,
    DisplayNameMaxLength = 50,
    HandleMaxLength = 30,
    SearchMaxLength = 80,
    HashtagMaxLength = 64,
    TrendingTopicLimit = 10,
    ReportDetailsMaxLength = 500,
    MaxImages = 4,
    PostsPerMinute = 8,
    ActionsPerMinute = 90,
    ReportsPerDay = 10,
}

-- =============================================================================
-- Utilities, groups and transport
-- =============================================================================

Config.MapMarkers = {
    MaximumMarkers = 50,
    LabelMaxLength = 40,
    ActionsPerMinute = 60,
}

Config.CrewLink = {
    UsernameMinLength = 3,
    UsernameMaxLength = 20,
    PasswordMinLength = 8,
    PasswordMaxLength = 72,
    GroupNameMinLength = 3,
    GroupNameMaxLength = 32,
    MaximumGroupsPerProfile = 5,
    MaximumMembersPerGroup = 16,
    InviteCodeLength = 8,
    InviteLifetimeSeconds = 30,
    NearbyInviteDistance = 5.0,
    NearbyScanLimit = 12,
    PingLabelMaxLength = 48,
    PingLifetimeSeconds = 300,
    MaximumActivePings = 12,
    ActionsPerMinute = 30,
    LiveRequestsPerMinute = 120,
    OverheadRefreshMilliseconds = 3000,
    OverheadDistance = 50.0,
    ExternalPingResources = {
        -- ["example_resource"] = true,
    },
}

Config.Calendar = {
    TitleMaxLength = 120,
    NoteMaxLength = 2000,
    MaximumDurationSeconds = 7 * 24 * 60 * 60,
    MaximumQuerySeconds = 370 * 24 * 60 * 60,
    PastEditSeconds = 365 * 24 * 60 * 60,
    FutureSeconds = 5 * 365 * 24 * 60 * 60,
    ReminderPollSeconds = 15,
}

Config.SkyRide = {
    PaymentAccount = "bank",
    Currency = "$",
    ProfileNameMinLength = 2,
    ProfileNameMaxLength = 50,
    DistanceUnit = "kilometer", -- kilometer or mile
    QuoteLifetimeSeconds = 120,
    HistoryLimit = 50,
    ReadsPerMinute = 120,
    ActionsPerMinute = 30,
    QuotesPerMinute = 20,
    RecoveryIntervalSeconds = 15,
    PaymentPendingRecoverySeconds = 30,
    PickupSelectionRadius = 150.0,
    ArrivalRadius = 40.0,
    CompletionRadius = 80.0,
    MinimumDistanceMeters = 250,
    MaximumDistanceMeters = 40000,
    RouteDistanceMultiplier = 1.25,
    AverageSpeedMetersPerSecond = 12.0,
    DriverPayoutPercent = 85,
    RatingCommentMaxLength = 300,
    MaximumTip = 10000,
    CustomFare = {
        Enabled = true,
        MinimumPrice = 5,
        MaximumPrice = 100000,
        MinimumCalculatedMultiplier = 0.5,
        MaximumCalculatedMultiplier = 3.0,
    },
    DriverJobs = {
        taxi = 0,
    },
    Services = {
        {
            Id = "taxi",
            Seats = 4,
            EtaMinutes = 3,
            BaseFare = 12,
            PricePerKilometer = 18,
            PricePerMile = 29,
            PricePerMinute = 1,
            MinimumFare = 15,
        },
        {
            Id = "comfort",
            Seats = 4,
            EtaMinutes = 5,
            BaseFare = 16,
            PricePerKilometer = 24,
            PricePerMile = 39,
            PricePerMinute = 2,
            MinimumFare = 22,
        },
        {
            Id = "xl",
            Seats = 6,
            EtaMinutes = 7,
            BaseFare = 20,
            PricePerKilometer = 30,
            PricePerMile = 48,
            PricePerMinute = 2,
            MinimumFare = 28,
        },
        {
            Id = "premium",
            Seats = 4,
            EtaMinutes = 8,
            BaseFare = 28,
            PricePerKilometer = 40,
            PricePerMile = 64,
            PricePerMinute = 3,
            MinimumFare = 38,
        },
    },
    QuickLocations = {
        {
            Id = "legion-square",
            Label = "Legion Square",
            Coords = vector3(-265.1, -960.2, 31.2),
        },
        {
            Id = "diamond-casino",
            Label = "Diamond Casino",
            Coords = vector3(925.2, 46.4, 81.1),
        },
        {
            Id = "airport",
            Label = "Los Santos Airport",
            Coords = vector3(-1037.7, -2737.8, 20.2),
        },
        {
            Id = "vinewood",
            Label = "Vinewood",
            Coords = vector3(-594.4, -929.9, 23.9),
        },
    },
}

-- =============================================================================
-- Server-only configuration
-- =============================================================================

if IsDuplicityVersion() then
    -- -------------------------------------------------------------------------
    -- Server secrets
    -- -------------------------------------------------------------------------

    Config.Server = {
        -- Keep these values private and stable. Changing a pepper invalidates existing app passwords.
        PasscodePepper = "f626581802800478346266e66414d8e6f2c28050214a593c25901904c162bffe",
        CrewLinkPasswordPepper = "2751e5729aee4955a529c1a87104b58fbe1d7280b18b66264236028caa06eb47",
        FlipTokPasswordPepper = "a85ea307680f1205a4fda03be8af18ecf7edf16ffc83450b90cac7e41a9719a7",
        PicstagramPasswordPepper = "653e41dd19aba5ef750a668ad1886273ba7d0e0420bd5c745748df80a6e22676",
    }

    -- -------------------------------------------------------------------------
    -- Server-owned payphone locations
    -- -------------------------------------------------------------------------

    -- Server-owned vanilla payphone positions used for authoritative proximity checks.
    -- Generated from DurtyFree/gta-v-data-dumps worldPublicPhones.json at commit b65684e00f689fdec405c5f1055322c802d3c895.
    -- Add custom-map booths here; their model must also be listed in Config.Payphones.Props.
    Config.Payphones.Locations = {
        { model = "prop_phonebox_01a", coords = { x = -1819.2284, y = 796.32294, z = 137.12784 } },
        { model = "prop_phonebox_01a", coords = { x = -1773.0256, y = -503.15234, z = 37.80706 } },
        { model = "prop_phonebox_01a", coords = { x = -1772.2114, y = -504.00488, z = 37.81461 } },
        { model = "prop_phonebox_01a", coords = { x = -1457.3734, y = -148.68604, z = 48.7486 } },
        { model = "prop_phonebox_01a", coords = { x = -1456.838, y = -149.31949, z = 48.68604 } },
        { model = "prop_phonebox_01a", coords = { x = -1456.3501, y = -149.95428, z = 48.61642 } },
        { model = "prop_phonebox_01a", coords = { x = -1438.6545, y = -210.77448, z = 47.10766 } },
        { model = "prop_phonebox_01a", coords = { x = -1418.2983, y = -291.36002, z = 42.96778 } },
        { model = "prop_phonebox_01a", coords = { x = -1417.4769, y = -290.64453, z = 42.93899 } },
        { model = "prop_phonebox_01a", coords = { x = -1416.5211, y = -289.8119, z = 42.90134 } },
        { model = "prop_phonebox_01a", coords = { x = -1318.0975, y = -380.79547, z = 35.73553 } },
        { model = "prop_phonebox_01a", coords = { x = -1316.9534, y = -378.42676, z = 35.74885 } },
        { model = "prop_phonebox_01a", coords = { x = -1316.2688, y = -378.07245, z = 35.73169 } },
        { model = "prop_phonebox_01a", coords = { x = -1315.5924, y = -377.7347, z = 35.72274 } },
        { model = "prop_phonebox_01a", coords = { x = -1261.6484, y = -519.13086, z = 30.83657 } },
        { model = "prop_phonebox_01a", coords = { x = -1260.9482, y = -519.9344, z = 30.75686 } },
        { model = "prop_phonebox_01a", coords = { x = -1260.0995, y = -520.9083, z = 30.66707 } },
        { model = "prop_phonebox_01a", coords = { x = -1121.5917, y = -825.6313, z = 14.94339 } },
        { model = "prop_phonebox_01a", coords = { x = -1120.9409, y = -825.0698, z = 14.98657 } },
        { model = "prop_phonebox_01a", coords = { x = -1120.2446, y = -824.4812, z = 15.06407 } },
        { model = "prop_phonebox_01a", coords = { x = -1079.6154, y = -451.0622, z = 35.6144 } },
        { model = "prop_phonebox_01a", coords = { x = -1079.23, y = -451.8739, z = 35.62138 } },
        { model = "prop_phonebox_01a", coords = { x = -1078.874, y = -452.55182, z = 35.62138 } },
        { model = "prop_phonebox_01a", coords = { x = -956.56256, y = -403.17123, z = 36.81676 } },
        { model = "prop_phonebox_01a", coords = { x = -956.1004, y = -404.09232, z = 36.81755 } },
        { model = "prop_phonebox_01a", coords = { x = -524.4403, y = -300.71704, z = 34.26753 } },
        { model = "prop_phonebox_01a", coords = { x = -523.64453, y = -300.41074, z = 34.26273 } },
        { model = "prop_phonebox_01a", coords = { x = -522.872, y = -300.1134, z = 34.25807 } },
        { model = "prop_phonebox_01a", coords = { x = -449.44238, y = -272.8244, z = 34.93996 } },
        { model = "prop_phonebox_01a", coords = { x = -448.8816, y = -274.12805, z = 34.96191 } },
        { model = "prop_phonebox_01a", coords = { x = -448.36926, y = -275.31906, z = 34.96507 } },
        { model = "prop_phonebox_01a", coords = { x = -329.23917, y = 6224.885, z = 30.47861 } },
        { model = "prop_phonebox_01a", coords = { x = -310.30554, y = 6205.3, z = 30.4465 } },
        { model = "prop_phonebox_01a", coords = { x = -280.64215, y = 6224.2314, z = 30.45544 } },
        { model = "prop_phonebox_01a", coords = { x = -243.25082, y = 279.90717, z = 91.04989 } },
        { model = "prop_phonebox_01a", coords = { x = -234.61494, y = 6176.931, z = 30.43884 } },
        { model = "prop_phonebox_01a", coords = { x = -233.6865, y = 6176.0547, z = 30.43884 } },
        { model = "prop_phonebox_01a", coords = { x = -184.35658, y = 6331.4697, z = 30.48767 } },
        { model = "prop_phonebox_01a", coords = { x = -183.68753, y = 6332.1597, z = 30.48987 } },
        { model = "prop_phonebox_01a", coords = { x = -154.76048, y = 6352.27, z = 30.56079 } },
        { model = "prop_phonebox_01a", coords = { x = -153.88358, y = 6351.417, z = 30.56079 } },
        { model = "prop_phonebox_01a", coords = { x = -119.91727, y = 6287.283, z = 30.45911 } },
        { model = "prop_phonebox_01a", coords = { x = -119.44898, y = 6286.768, z = 30.45911 } },
        { model = "prop_phonebox_01a", coords = { x = -92.08037, y = 6462.644, z = 30.44397 } },
        { model = "prop_phonebox_01a", coords = { x = -90.61212, y = 6464.0566, z = 30.44397 } },
        { model = "prop_phonebox_01a", coords = { x = -46.3855, y = 6511.0156, z = 30.44861 } },
        { model = "prop_phonebox_01a", coords = { x = -25.6331, y = 6495.123, z = 30.48767 } },
        { model = "prop_phonebox_01a", coords = { x = -24.59157, y = 6496.0537, z = 30.48767 } },
        { model = "prop_phonebox_01a", coords = { x = 110.07694, y = -1694.206, z = 28.29156 } },
        { model = "prop_phonebox_01a", coords = { x = 136.9704, y = 196.05042, z = 105.73364 } },
        { model = "prop_phonebox_01a", coords = { x = 137.75732, y = 195.764, z = 105.70988 } },
        { model = "prop_phonebox_01a", coords = { x = 138.48807, y = 195.49808, z = 105.69342 } },
        { model = "prop_phonebox_01a", coords = { x = 173.45892, y = -1547.1165, z = 28.25158 } },
        { model = "prop_phonebox_01a", coords = { x = 215.71725, y = -1783.2102, z = 27.99637 } },
        { model = "prop_phonebox_01a", coords = { x = 215.94612, y = -1518.9603, z = 28.29362 } },
        { model = "prop_phonebox_01a", coords = { x = 228.6216, y = -1545.9579, z = 28.28108 } },
        { model = "prop_phonebox_01a", coords = { x = 229.1375, y = -1545.6771, z = 28.28108 } },
        { model = "prop_phonebox_01a", coords = { x = 295.67847, y = -1360.8624, z = 30.91401 } },
        { model = "prop_phonebox_01a", coords = { x = 296.17984, y = -1360.2825, z = 30.91899 } },
        { model = "prop_phonebox_01a", coords = { x = 532.401, y = -151.79816, z = 56.07613 } },
        { model = "prop_phonebox_01a", coords = { x = 539.5577, y = -166.04846, z = 53.4862 } },
        { model = "prop_phonebox_01a", coords = { x = 812.21716, y = -289.03873, z = 65.46264 } },
        { model = "prop_phonebox_01a", coords = { x = 812.3678, y = -289.84793, z = 65.46264 } },
        { model = "prop_phonebox_01a", coords = { x = 819.023, y = -94.03439, z = 79.57648 } },
        { model = "prop_phonebox_01a", coords = { x = 819.37396, y = -93.47577, z = 79.57648 } },
        { model = "prop_phonebox_01a", coords = { x = 891.8809, y = -140.80609, z = 76.11372 } },
        { model = "prop_phonebox_01a", coords = { x = 963.6167, y = -142.79822, z = 73.46588 } },
        { model = "prop_phonebox_01a", coords = { x = 1079.2015, y = -776.68054, z = 57.25418 } },
        { model = "prop_phonebox_01a", coords = { x = 1156.3375, y = -776.99866, z = 56.58559 } },
        { model = "prop_phonebox_01a", coords = { x = 1159.7463, y = -374.87518, z = 66.51784 } },
        { model = "prop_phonebox_01a", coords = { x = 1166.4825, y = -321.59958, z = 68.25383 } },
        { model = "prop_phonebox_01a", coords = { x = 1169.4127, y = 2702.8025, z = 36.99265 } },
        { model = "prop_phonebox_01a", coords = { x = 1170.3059, y = -455.76053, z = 65.49249 } },
        { model = "prop_phonebox_01a", coords = { x = 1172.7772, y = -297.61606, z = 68.01613 } },
        { model = "prop_phonebox_01a", coords = { x = 1172.8646, y = -298.23972, z = 68.01981 } },
        { model = "prop_phonebox_01a", coords = { x = 1173.8961, y = -421.43643, z = 66.07632 } },
        { model = "prop_phonebox_01a", coords = { x = 1201.426, y = -488.8848, z = 64.67129 } },
        { model = "prop_phonebox_01a", coords = { x = 1222.6125, y = -397.32706, z = 67.32355 } },
        { model = "prop_phonebox_01a", coords = { x = 1801.4076, y = 4597.0137, z = 36.67796 } },
        { model = "prop_phonebox_01a", coords = { x = 2558.9167, y = 367.14368, z = 107.63403 } },
        { model = "prop_phonebox_01b", coords = { x = -1684.4233, y = -266.45306, z = 50.89204 } },
        { model = "prop_phonebox_01b", coords = { x = -1683.9019, y = -265.70874, z = 50.89204 } },
        { model = "prop_phonebox_01b", coords = { x = -1543.9277, y = -433.13232, z = 34.57933 } },
        { model = "prop_phonebox_01b", coords = { x = -1543.0599, y = -432.05966, z = 34.58469 } },
        { model = "prop_phonebox_01b", coords = { x = -1522.4791, y = -407.05118, z = 34.58695 } },
        { model = "prop_phonebox_01b", coords = { x = -1412.1201, y = -383.80542, z = 35.68469 } },
        { model = "prop_phonebox_01b", coords = { x = -1205.1965, y = -1393.6274, z = 3.07721 } },
        { model = "prop_phonebox_01b", coords = { x = -1150.6671, y = -1392.6455, z = 4.11812 } },
        { model = "prop_phonebox_01b", coords = { x = -1142.0598, y = -725.3442, z = 19.77577 } },
        { model = "prop_phonebox_01b", coords = { x = -1080.87, y = -2574.942, z = 12.91528 } },
        { model = "prop_phonebox_01b", coords = { x = -1061.7015, y = -2541.7412, z = 12.91528 } },
        { model = "prop_phonebox_01b", coords = { x = -1061.5474, y = -2541.4744, z = 19.15571 } },
        { model = "prop_phonebox_01b", coords = { x = -1046.9408, y = -2516.175, z = 12.91528 } },
        { model = "prop_phonebox_01b", coords = { x = -1046.8787, y = -2516.0674, z = 19.15571 } },
        { model = "prop_phonebox_01b", coords = { x = -1034.5115, y = -2494.6467, z = 19.15571 } },
        { model = "prop_phonebox_01b", coords = { x = -1024.4517, y = -2477.2227, z = 12.91528 } },
        { model = "prop_phonebox_01b", coords = { x = -765.40045, y = -848.8706, z = 21.11398 } },
        { model = "prop_phonebox_01b", coords = { x = -764.83673, y = -848.8654, z = 21.13071 } },
        { model = "prop_phonebox_01b", coords = { x = -756.90735, y = 5586.8223, z = 35.71351 } },
        { model = "prop_phonebox_01b", coords = { x = -756.90735, y = 5587.636, z = 35.71351 } },
        { model = "prop_phonebox_01b", coords = { x = -745.72156, y = 5558.714, z = 35.71351 } },
        { model = "prop_phonebox_01b", coords = { x = -743.95874, y = 5558.714, z = 35.71351 } },
        { model = "prop_phonebox_01b", coords = { x = -715.921, y = 123.33502, z = 54.99648 } },
        { model = "prop_phonebox_01b", coords = { x = -715.40906, y = 123.65546, z = 55.01274 } },
        { model = "prop_phonebox_01b", coords = { x = -700.7271, y = -916.8699, z = 18.21408 } },
        { model = "prop_phonebox_01b", coords = { x = -700.1226, y = -916.8699, z = 18.21408 } },
        { model = "prop_phonebox_01b", coords = { x = -685.93774, y = -854.8967, z = 22.88396 } },
        { model = "prop_phonebox_01b", coords = { x = -670.3093, y = -819.59973, z = 23.4098 } },
        { model = "prop_phonebox_01b", coords = { x = -669.60815, y = -819.6056, z = 23.42427 } },
        { model = "prop_phonebox_01b", coords = { x = -668.81213, y = -819.6378, z = 23.43811 } },
        { model = "prop_phonebox_01b", coords = { x = -665.19354, y = -670.83777, z = 30.40002 } },
        { model = "prop_phonebox_01b", coords = { x = -664.59607, y = -670.8341, z = 30.40393 } },
        { model = "prop_phonebox_01b", coords = { x = -663.99866, y = -670.83044, z = 30.41797 } },
        { model = "prop_phonebox_01b", coords = { x = -655.2001, y = -859.74493, z = 23.50043 } },
        { model = "prop_phonebox_01b", coords = { x = -654.1605, y = -707.27155, z = 28.40153 } },
        { model = "prop_phonebox_01b", coords = { x = -654.1605, y = -706.51654, z = 28.47383 } },
        { model = "prop_phonebox_01b", coords = { x = -654.1605, y = -705.7615, z = 28.54753 } },
        { model = "prop_phonebox_01b", coords = { x = -611.56744, y = -2237.6104, z = 5.10603 } },
        { model = "prop_phonebox_01b", coords = { x = -530.0182, y = -1286.1543, z = 25.03622 } },
        { model = "prop_phonebox_01b", coords = { x = -529.77765, y = -1285.6444, z = 25.04207 } },
        { model = "prop_phonebox_01b", coords = { x = -529.6009, y = -1286.3458, z = 25.04428 } },
        { model = "prop_phonebox_01b", coords = { x = -529.36365, y = -1285.8345, z = 25.03622 } },
        { model = "prop_phonebox_01b", coords = { x = -468.24023, y = -396.44247, z = 32.8951 } },
        { model = "prop_phonebox_01b", coords = { x = -467.58286, y = -396.50574, z = 32.8951 } },
        { model = "prop_phonebox_01b", coords = { x = -259.3869, y = -604.76556, z = 32.59827 } },
        { model = "prop_phonebox_01b", coords = { x = -259.14352, y = -603.98016, z = 32.65002 } },
        { model = "prop_phonebox_01b", coords = { x = -241.57574, y = -766.2026, z = 31.73654 } },
        { model = "prop_phonebox_01b", coords = { x = -241.29694, y = -765.4682, z = 31.77955 } },
        { model = "prop_phonebox_01b", coords = { x = -239.74597, y = -978.22943, z = 28.26393 } },
        { model = "prop_phonebox_01b", coords = { x = -239.51797, y = -977.59296, z = 28.26393 } },
        { model = "prop_phonebox_01b", coords = { x = -178.84961, y = -52.06338, z = 51.10093 } },
        { model = "prop_phonebox_01b", coords = { x = -177.28662, y = -713.48505, z = 33.39728 } },
        { model = "prop_phonebox_01b", coords = { x = -147.61765, y = -287.15277, z = 39.43044 } },
        { model = "prop_phonebox_01b", coords = { x = -147.37784, y = -286.44186, z = 39.49831 } },
        { model = "prop_phonebox_01b", coords = { x = -73.17541, y = -641.5052, z = 35.24065 } },
        { model = "prop_phonebox_01b", coords = { x = -72.92773, y = -640.8415, z = 35.24065 } },
        { model = "prop_phonebox_01b", coords = { x = -53.45404, y = -94.169, z = 56.7686 } },
        { model = "prop_phonebox_01b", coords = { x = -27.98413, y = -100.90671, z = 56.35694 } },
        { model = "prop_phonebox_01b", coords = { x = -26.48154, y = -110.65947, z = 56.06785 } },
        { model = "prop_phonebox_01b", coords = { x = -8.06136, y = -731.61005, z = 43.22259 } },
        { model = "prop_phonebox_01b", coords = { x = -7.37235, y = -731.8549, z = 43.22768 } },
        { model = "prop_phonebox_01b", coords = { x = 43.99314, y = -680.87616, z = 43.20672 } },
        { model = "prop_phonebox_01b", coords = { x = 44.30204, y = -680.0512, z = 43.20672 } },
        { model = "prop_phonebox_01b", coords = { x = 120.37446, y = -205.12677, z = 53.61985 } },
        { model = "prop_phonebox_01b", coords = { x = 121.18489, y = -205.42413, z = 53.61985 } },
        { model = "prop_phonebox_01b", coords = { x = 129.40686, y = 245.3497, z = 106.42847 } },
        { model = "prop_phonebox_01b", coords = { x = 140.18076, y = -1033.1602, z = 28.34242 } },
        { model = "prop_phonebox_01b", coords = { x = 174.5452, y = -1116.4456, z = 28.28443 } },
        { model = "prop_phonebox_01b", coords = { x = 175.22937, y = -1116.4185, z = 28.28425 } },
        { model = "prop_phonebox_01b", coords = { x = 213.8157, y = -852.6208, z = 29.38956 } },
        { model = "prop_phonebox_01b", coords = { x = 214.44952, y = -852.86725, z = 29.38709 } },
        { model = "prop_phonebox_01b", coords = { x = 233.49872, y = 334.44766, z = 104.52145 } },
        { model = "prop_phonebox_01b", coords = { x = 296.66183, y = -1359.7725, z = 30.92093 } },
        { model = "prop_phonebox_01b", coords = { x = 372.30563, y = -966.37286, z = 28.41298 } },
        { model = "prop_phonebox_01b", coords = { x = 394.25433, y = -799.7535, z = 28.23798 } },
        { model = "prop_phonebox_01b", coords = { x = 394.25433, y = -798.6486, z = 28.23798 } },
        { model = "prop_phonebox_01b", coords = { x = 397.567, y = -921.3287, z = 28.3982 } },
        { model = "prop_phonebox_01b", coords = { x = 397.567, y = -920.658, z = 28.3982 } },
        { model = "prop_phonebox_01b", coords = { x = 415.17245, y = -910.94476, z = 28.3982 } },
        { model = "prop_phonebox_01b", coords = { x = 436.0411, y = 137.20285, z = 99.43968 } },
        { model = "prop_phonebox_01b", coords = { x = 436.83813, y = 136.89954, z = 99.38892 } },
        { model = "prop_phonebox_01b", coords = { x = 439.8047, y = -606.65063, z = 27.69825 } },
        { model = "prop_phonebox_01b", coords = { x = 439.99564, y = -604.67474, z = 27.69747 } },
        { model = "prop_phonebox_01b", coords = { x = 445.3808, y = 3567.5305, z = 32.21765 } },
        { model = "prop_phonebox_01b", coords = { x = 452.6532, y = -612.11816, z = 27.54012 } },
        { model = "prop_phonebox_01b", coords = { x = 452.7997, y = -610.4434, z = 27.5457 } },
        { model = "prop_phonebox_01b", coords = { x = 535.5781, y = 102.93228, z = 95.56698 } },
        { model = "prop_phonebox_01b", coords = { x = 779.83923, y = -1755.3914, z = 28.47611 } },
        { model = "prop_phonebox_01b", coords = { x = 780.2285, y = -1755.4475, z = 28.46564 } },
        { model = "prop_phonebox_01b", coords = { x = 809.3085, y = -1074.9281, z = 27.67919 } },
        { model = "prop_phonebox_01b", coords = { x = 903.52423, y = 3646.1294, z = 31.70571 } },
        { model = "prop_phonebox_01b", coords = { x = 1051.0497, y = 2661.3877, z = 38.52392 } },
        { model = "prop_phonebox_01b", coords = { x = 1181.1997, y = 2703.214, z = 37.1464 } },
        { model = "prop_phonebox_01b", coords = { x = 1206.4275, y = 2647.8894, z = 36.81204 } },
        { model = "prop_phonebox_01b", coords = { x = 1401.1744, y = 3602.0786, z = 34.01619 } },
        { model = "prop_phonebox_01b", coords = { x = 1662.8026, y = 4841.53, z = 41.0313 } },
        { model = "prop_phonebox_01b", coords = { x = 1662.9365, y = 4840.332, z = 41.0313 } },
        { model = "prop_phonebox_01b", coords = { x = 1692.9031, y = 6432.025, z = 31.73361 } },
        { model = "prop_phonebox_01b", coords = { x = 1696.5485, y = 3776.0618, z = 33.71252 } },
        { model = "prop_phonebox_01b", coords = { x = 1696.7177, y = 4790.302, z = 40.89749 } },
        { model = "prop_phonebox_01b", coords = { x = 1860.4072, y = 3696.2563, z = 33.26152 } },
        { model = "prop_phonebox_01b", coords = { x = 1861.0801, y = 3695.0903, z = 33.26152 } },
        { model = "prop_phonebox_01b", coords = { x = 2005.9707, y = 3782.6196, z = 31.15662 } },
        { model = "prop_phonebox_01b", coords = { x = 2006.7942, y = 3783.1003, z = 31.14984 } },
        { model = "prop_phonebox_04", coords = { x = -2969.4265, y = 397.46487, z = 14.10208 } },
        { model = "prop_phonebox_04", coords = { x = -1417.7056, y = -94.50974, z = 51.41046 } },
        { model = "prop_phonebox_04", coords = { x = -1416.8014, y = -94.11159, z = 51.44441 } },
        { model = "prop_phonebox_04", coords = { x = -1415.9122, y = -93.72023, z = 51.49042 } },
        { model = "prop_phonebox_04", coords = { x = -1294.0234, y = -390.34976, z = 35.44277 } },
        { model = "prop_phonebox_04", coords = { x = -1293.4121, y = -391.38864, z = 35.44632 } },
        { model = "prop_phonebox_04", coords = { x = -1241.7491, y = -464.37216, z = 32.537 } },
        { model = "prop_phonebox_04", coords = { x = -1224.2532, y = -322.51794, z = 36.57259 } },
        { model = "prop_phonebox_04", coords = { x = -1223.0624, y = -321.95178, z = 36.59326 } },
        { model = "prop_phonebox_04", coords = { x = -1074.0209, y = -397.75607, z = 35.95449 } },
        { model = "prop_phonebox_04", coords = { x = -1025.3336, y = -216.04681, z = 36.93829 } },
        { model = "prop_phonebox_04", coords = { x = -1023.97375, y = -216.74884, z = 36.9369 } },
        { model = "prop_phonebox_04", coords = { x = -985.19824, y = -414.10977, z = 36.85289 } },
        { model = "prop_phonebox_04", coords = { x = -979.73254, y = -369.2069, z = 36.856 } },
        { model = "prop_phonebox_04", coords = { x = -979.1488, y = -370.3092, z = 36.856 } },
        { model = "prop_phonebox_04", coords = { x = -965.37616, y = -2524.3992, z = 13.00643 } },
        { model = "prop_phonebox_04", coords = { x = -963.65985, y = -247.05435, z = 37.0568 } },
        { model = "prop_phonebox_04", coords = { x = -896.8487, y = -247.80585, z = 39.07844 } },
        { model = "prop_phonebox_04", coords = { x = -865.3409, y = -2528.5645, z = 13.00643 } },
        { model = "prop_phonebox_04", coords = { x = -821.83124, y = -251.49579, z = 36.0627 } },
        { model = "prop_phonebox_04", coords = { x = -821.29346, y = -252.4495, z = 36.05127 } },
        { model = "prop_phonebox_04", coords = { x = -701.46173, y = -371.56976, z = 33.2833 } },
        { model = "prop_phonebox_04", coords = { x = -700.3627, y = -372.04968, z = 33.27078 } },
        { model = "prop_phonebox_04", coords = { x = -619.5328, y = -207.68121, z = 36.3736 } },
        { model = "prop_phonebox_04", coords = { x = -618.975, y = -208.61508, z = 36.35005 } },
        { model = "prop_phonebox_04", coords = { x = -617.05457, y = -422.20978, z = 33.7873 } },
        { model = "prop_phonebox_04", coords = { x = -557.25586, y = -386.67517, z = 34.11347 } },
        { model = "prop_phonebox_04", coords = { x = -556.05286, y = -386.66565, z = 34.11989 } },
        { model = "prop_phonebox_04", coords = { x = -554.8701, y = -386.6563, z = 34.12583 } },
        { model = "prop_phonebox_04", coords = { x = -546.57184, y = -334.10083, z = 34.16116 } },
        { model = "prop_phonebox_04", coords = { x = -544.17737, y = -157.39006, z = 37.53791 } },
        { model = "prop_phonebox_04", coords = { x = -388.49542, y = -321.52948, z = 32.10458 } },
        { model = "prop_phonebox_04", coords = { x = -387.68488, y = -322.21454, z = 32.05279 } },
        { model = "prop_phonebox_04", coords = { x = -360.33978, y = -267.18268, z = 32.73604 } },
        { model = "prop_phonebox_04", coords = { x = -347.059, y = -1490.9738, z = 29.79159 } },
        { model = "prop_phonebox_04", coords = { x = -345.83786, y = -1490.9738, z = 29.7867 } },
        { model = "prop_phonebox_04", coords = { x = -263.0376, y = -766.90546, z = 31.57576 } },
        { model = "prop_phonebox_04", coords = { x = -262.6508, y = -766.04095, z = 31.60592 } },
        { model = "prop_phonebox_04", coords = { x = -213.1738, y = -696.5944, z = 32.80729 } },
        { model = "prop_phonebox_04", coords = { x = -174.76907, y = -674.9272, z = 33.27862 } },
        { model = "prop_phonebox_04", coords = { x = -173.80676, y = -675.35236, z = 33.29762 } },
        { model = "prop_phonebox_04", coords = { x = -138.00961, y = -799.9025, z = 31.10711 } },
        { model = "prop_phonebox_04", coords = { x = -137.64026, y = -798.8024, z = 31.14563 } },
        { model = "prop_phonebox_04", coords = { x = 55.44337, y = -1081.1333, z = 28.45174 } },
        { model = "prop_phonebox_04", coords = { x = 55.90165, y = -1080.282, z = 28.45174 } },
        { model = "prop_phonebox_04", coords = { x = 188.01767, y = -1043.9451, z = 28.32789 } },
        { model = "prop_phonebox_04", coords = { x = 189.79306, y = -1044.5588, z = 28.32789 } },
        { model = "prop_phonebox_04", coords = { x = 298.28317, y = -795.153, z = 28.4778 } },
        { model = "prop_phonebox_04", coords = { x = 298.62607, y = -794.289, z = 28.4778 } },
        { model = "prop_phonebox_04", coords = { x = 347.45938, y = -730.9255, z = 28.28353 } },
        { model = "prop_phonebox_04", coords = { x = 564.7501, y = -1748.7141, z = 28.31245 } },
        { model = "prop_phonebox_04", coords = { x = 653.1738, y = 272.5705, z = 102.29323 } },
        { model = "prop_phonebox_04", coords = { x = 654.2313, y = 271.95996, z = 102.29323 } },
        { model = "prop_phonebox_04", coords = { x = 1214.8445, y = -1385.6348, z = 34.34755 } },
        { model = "prop_phonebox_04", coords = { x = 1214.8445, y = -1384.5386, z = 34.34755 } },
        { model = "prop_phonebox_04", coords = { x = 1662.002, y = 4819.523, z = 41.04535 } },
        { model = "prop_phonebox_04", coords = { x = 1816.4236, y = 3671.6497, z = 33.29268 } },
        { model = "prop_phonebox_04", coords = { x = 1818.1936, y = 3668.7485, z = 33.29268 } },
        { model = "prop_phonebox_04", coords = { x = 2007.0574, y = 3784.7974, z = 31.20895 } },
    }

    -- -------------------------------------------------------------------------
    -- Company directory
    -- -------------------------------------------------------------------------

    Config.Companies = {
        Enabled = true,
        PageSize = 20,
        MaximumPageSize = 50,
        MaximumOpenRequestsPerSim = 5,
        MaximumServices = 25,
        MaximumRequestMedia = 3,
        SubjectMaxLength = 120,
        RequestBodyMaxLength = 2000,
        MessageMaxLength = 2000,
        ProfileDescriptionMaxLength = 1000,
        DistrictMaxLength = 80,
        AddressMaxLength = 160,
        ServiceTitleMaxLength = 80,
        ServiceDescriptionMaxLength = 500,
        ServicePriceMaxLength = 80,
        AnnouncementTitleMaxLength = 120,
        AnnouncementBodyMaxLength = 1000,
        AvailabilityMaximumSeconds = 24 * 60 * 60,
        AnnouncementMaximumSeconds = 30 * 24 * 60 * 60,
        RetentionDays = 180,
        RateLimits = {
            Read = 120,
            Search = 60,
            CreateRequest = 5,
            Message = 30,
            RequestAction = 30,
            Profile = 12,
            CallAvailability = 30,
        },
        CallRouting = {
            MaxAttempts = 3,
            RingSeconds = 10,
        },
        Categories = {
            "public_services",
            "vehicles",
            "transport",
        },
        Statuses = {
            new = true,
            assigned = true,
            in_progress = true,
            waiting_customer = true,
            completed = true,
            cancelled = true,
        },
        AvailabilityStatuses = {
            available = true,
            busy = true,
            closed = true,
        },
        Definitions = {
            police = {
                Job = "police",
                Name = "Los Santos Police Department",
                Category = "public_services",
                Public = true,
                Emergency = true,
                Verified = true,
                Icon = "shield",
                LogoUrl = "https://picsum.photos/seed/companies-police-logo/180/180",
                Description = "Public safety, emergency response, and police services.",
                DefaultAvailability = "closed",
                AcceptsRequests = false,
                District = "Mission Row",
                LocationLabel = "Mission Row Police Station",
                Address = "Mission Row Police Station",
                Location = vector3(425.1, -979.5, 30.7),
                ServiceLine = {
                    Number = "911",
                    AutoContact = true,
                    CanCall = true,
                    CanMessage = false,
                    Routing = "round_robin",
                    MinimumGrade = 0,
                },
                Permissions = {
                    WorkQueue = 0,
                    Availability = 1,
                    Assign = 2,
                    Profile = 3,
                    Hours = 3,
                    Services = 3,
                    Announcement = 3,
                },
                Services = {},
            },
            ambulance = {
                Job = "ambulance",
                Name = "Emergency Medical Services",
                Category = "public_services",
                Public = true,
                Emergency = true,
                Verified = true,
                Icon = "medical",
                LogoUrl = "https://picsum.photos/seed/companies-ems-logo/180/180",
                Description = "Emergency medical response and patient care.",
                DefaultAvailability = "closed",
                AcceptsRequests = false,
                District = "Pillbox Hill",
                LocationLabel = "Pillbox Hill Medical Center",
                Address = "Pillbox Hill Medical Center",
                Location = vector3(307.2, -595.3, 43.3),
                ServiceLine = {
                    Number = "912",
                    AutoContact = true,
                    CanCall = true,
                    CanMessage = false,
                    Routing = "round_robin",
                    MinimumGrade = 0,
                },
                Permissions = {
                    WorkQueue = 0,
                    Availability = 1,
                    Assign = 2,
                    Profile = 3,
                    Hours = 3,
                    Services = 3,
                    Announcement = 3,
                },
                Services = {},
            },
            fire = {
                Job = "fire",
                Name = "Los Santos Fire Department",
                Category = "public_services",
                Public = true,
                Emergency = true,
                Verified = true,
                Icon = "flame",
                LogoUrl = "https://picsum.photos/seed/companies-fire-logo/180/180",
                Description = "Fire response, rescue, and public safety services.",
                DefaultAvailability = "closed",
                AcceptsRequests = false,
                District = "El Burro Heights",
                LocationLabel = "Capital Boulevard Fire Station",
                Address = "Capital Boulevard Fire Station",
                Location = vector3(1200.6, -1473.6, 34.9),
                ServiceLine = {
                    Number = "913",
                    AutoContact = true,
                    CanCall = true,
                    CanMessage = false,
                    Routing = "round_robin",
                    MinimumGrade = 0,
                },
                Permissions = {
                    WorkQueue = 0,
                    Availability = 1,
                    Assign = 2,
                    Profile = 3,
                    Hours = 3,
                    Services = 3,
                    Announcement = 3,
                },
                Services = {},
            },
            mechanic = {
                Job = "mechanic",
                Name = "Los Santos Customs",
                Category = "vehicles",
                Public = true,
                Emergency = false,
                Verified = true,
                Icon = "wrench",
                LogoUrl = "https://picsum.photos/seed/companies-mechanic-logo/180/180",
                Description = "Vehicle diagnostics, repairs, and roadside assistance.",
                DefaultAvailability = "closed",
                AcceptsRequests = true,
                District = "Burton",
                LocationLabel = "Los Santos Customs",
                Address = "Carcer Way",
                Location = vector3(-337.3, -136.9, 39.0),
                ServiceLine = {
                    Number = "5550101000",
                    AutoContact = true,
                    CanCall = true,
                    CanMessage = false,
                    Routing = "round_robin",
                    MinimumGrade = 0,
                },
                Permissions = {
                    WorkQueue = 0,
                    Availability = 1,
                    Assign = 2,
                    Profile = 3,
                    Hours = 3,
                    Services = 3,
                    Announcement = 3,
                },
                Services = {
                    {
                        Id = "mechanic-repair",
                        Title = "Vehicle repair",
                        Description = "Diagnostics and repairs for road vehicles.",
                        Price = "Price after inspection",
                        RequestsEnabled = true,
                    },
                    {
                        Id = "mechanic-towing",
                        Title = "Roadside assistance",
                        Description = "Assistance for disabled vehicles.",
                        Price = "Price by distance",
                        RequestsEnabled = true,
                    },
                },
            },
            taxi = {
                Job = "taxi",
                Name = "Downtown Cab Co.",
                Category = "transport",
                Public = true,
                Emergency = false,
                Verified = true,
                Icon = "car",
                LogoUrl = "https://picsum.photos/seed/companies-taxi-logo/180/180",
                Description = "Staffed taxi rides throughout Los Santos and Blaine County.",
                DefaultAvailability = "closed",
                AcceptsRequests = true,
                District = "East Vinewood",
                LocationLabel = "Downtown Cab Co.",
                Address = "Tangerine Street",
                Location = vector3(895.0, -179.2, 74.7),
                ServiceLine = {
                    Number = "5550102000",
                    AutoContact = true,
                    CanCall = true,
                    CanMessage = false,
                    Routing = "round_robin",
                    MinimumGrade = 0,
                },
                Permissions = {
                    WorkQueue = 0,
                    Availability = 1,
                    Assign = 2,
                    Profile = 3,
                    Hours = 3,
                    Services = 3,
                    Announcement = 3,
                },
                Services = {
                    {
                        Id = "taxi-ride",
                        Title = "Taxi ride",
                        Description = "Request a staffed taxi service.",
                        Price = "Metered fare",
                        RequestsEnabled = true,
                    },
                },
            },
        },
    }

    -- -------------------------------------------------------------------------
    -- Music library
    -- -------------------------------------------------------------------------

    Config.Music = {
        -- Files are found recursively in config/music by their Id. For example,
        -- Id = "night-drive" finds night-drive.ogg/mp3 and optional artwork with
        -- the same name (.webp/.png/.jpg/.jpeg), even inside subdirectories.
        Tracks = {
            -- {
            --     Id = "night-drive",
            --     Title = "Night Drive",
            --     Artist = "Sky Records",
            -- },
        },

        MaximumPersonalSongs = 100,
        MaximumPlaylists = 50,
        MaximumPlaylistSongs = 250,
        PlaylistNameMaxLength = 80,
        ActionsPerMinute = 30,
        MetadataTimeoutMs = 4500,
    }

    -- -------------------------------------------------------------------------
    -- Weazel News
    -- -------------------------------------------------------------------------

    Config.WeazelNews = {
        Enabled = true,
        PageSize = 20,
        MaximumOffset = 10000,
        MaximumImages = 6,
        SearchMaxLength = 80,
        DraftTitleMinLength = 1,
        DraftBodyMinLength = 1,
        TitleMinLength = 1,
        TitleMaxLength = 160,
        BodyMinLength = 1,
        BodyMaxLength = 12000,
        ExcerptMaxLength = 240,
        RateLimits = {
            Read = 120,
            Write = 20,
        },
        Categories = {
            "official",
            "events",
            "jobs",
            "news",
            "business",
        },
        -- Framework job name = minimum grade. Every listed job can manage every article.
        AllowedJobs = {
            weazel = 0,
            reporter = 0,
        },
    }

    -- -------------------------------------------------------------------------
    -- Database migrations
    -- -------------------------------------------------------------------------

    Config.Migrations = Config.Migrations or {}

    -- Manual, non-destructive import from LB Phone's `phone_*` database tables.
    -- The migration never starts during a resource/server restart. Completed
    -- domains are recorded in `sky_phone_migrations` for idempotent retries.
    -- Import: skyphone:migrate lb-phone
    -- Console preview: skyphone:migrate lb-phone dry
    -- Idempotent retry: skyphone:migrate lb-phone force
    -- Remove imported Sky data: skyphone:migrate lb-phone remove
    Config.Migrations.LbPhone = {
        SourcePrefix = "phone_",

        -- auto: direct framework identifier first, then an unambiguous license match.
        -- identifier: only match phone_phones.owner_id to the framework identifier.
        -- license: only resolve phone_phones.owner_id through the framework license.
        IdentifierMode = "auto",

        Domains = {
            devices = true,
            settings = true,
            alarms = true,
            contacts = true,
            blocked = true,
            calls = true,
            messages = true,
            photos = true,
            notes = true,
            wallet = true,
            voiceMemos = true,
            picstagram = true,
            mail = true,
            mapMarkers = true,
            darkChat = true,
            flipTok = true,
            feather = true,
        },
    }
end
