Config.Bridge = {
    Framework = "auto", -- auto, esx, qbox, qb
    Inventory = "auto", -- auto, ox, qb, lj, qs, codem, core, mf, smx
    Locale = "en",
    CallbackTimeout = 15000,
    Debug = false,
    DebugLevels = {
        info = true,
        warn = true,
        error = true,
    },
}

Config.Command = "phone"

Config.Phone = {
    Item = "phone",
    DevelopmentCommand = true,
    DeviceName = "iFruit Phone",
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
    PasscodePepperConvar = "sky_phone_passcode_pepper",
    MaximumAttempts = 5,
    LockSeconds = 30,
    AttemptsPerMinute = 12,
}

Config.Sim = {
    RegisteredItem = "sky_phone_sim_registered",
    AnonymousItem = "sky_phone_sim_anonymous",
    NumberLength = 10,
    NumberPrefix = "",
    NumberGroups = { 3, 3, 4 },
}

Config.Calls = {
    VoiceProvider = "pma",
    RingSeconds = 30,
    ContactNameMaxLength = 80,
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
        Selfie = "anim@mp_player_intuppertake_selfie",
    },
    Clips = {
        TextIn = "cellphone_text_in",
        TextRead = "cellphone_text_read_base",
        TextOut = "cellphone_text_out",
        TextToCall = "cellphone_text_to_call",
        CallListen = "cellphone_call_listen_base",
        CallToText = "cellphone_call_to_text",
        CallOut = "cellphone_call_out",
        Selfie = "idle_a",
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
}

Config.Banking = {
    Currency = "$",
    MinimumAmount = 1,
    MaximumAmount = 1000000,
    ActionsPerMinute = 12,
    HistoryLimit = 50,
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
    TitleMinLength = 5,
    TitleMaxLength = 80,
    BodyMinLength = 10,
    BodyMaxLength = 1500,
    Categories = { "recommendation", "wanted", "service", "event", "place", "community" },
    CityMarktSharesPerDay = 1,
}

Config.FlipTok = {
    PageSize = 12,
    CaptionMaxLength = 500,
    CommentMaxLength = 300,
    BioMaxLength = 160,
    PasswordMinLength = 8,
    PasswordMaxLength = 72,
    PasswordPepperConvar = "sky_phone_fliptok_password_pepper",
    MaxVideoDurationMs = 300000,
    MusicTracks = {},
    VerifyCommand = "fliptokverify",
    AdminGroups = { "admin" },
    ReportAdminGroups = { "admin" },
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
    PasswordPepperConvar = "sky_phone_picstagram_password_pepper",
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

Config.MapMarkers = {
    MaximumMarkers = 50,
    LabelMaxLength = 40,
    ActionsPerMinute = 60,
}

Config.CrewLink = {
    UsernameMinLength = 3,
    UsernameMaxLength = 20,
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
