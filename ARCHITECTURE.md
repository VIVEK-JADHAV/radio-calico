# Radio Calico System Architecture

## Application Architecture

```mermaid
graph TB
    subgraph "Client Layer"
        Browser[Web Browser]
        HLS[HLS.js Player]
    end

    subgraph "Application Layer"
        Express[Express.js Server<br/>Port 3000]
        Static[Static Files<br/>HTML/CSS/JS]
        API[REST API<br/>Routes]
    end

    subgraph "Data Layer"
        SQLite[(SQLite Database<br/>app.db)]
        Users[Users Table]
        Ratings[Song Ratings Table]
    end

    subgraph "External Services"
        CDN[Metadata CDN<br/>Song Info]
        Stream[HLS Stream<br/>Audio Feed]
    end

    Browser --> HLS
    HLS --> Stream
    Browser --> Static
    Browser --> API
    API --> Express
    Express --> Static
    Express --> SQLite
    SQLite --> Users
    SQLite --> Ratings
    Browser --> CDN

    style Express fill:#1F4E23,color:#fff
    style SQLite fill:#38A29D,color:#fff
    style Browser fill:#EFA63C,color:#fff
```

## Docker Container Architecture

```mermaid
graph LR
    subgraph "Docker Environment"
        subgraph "radiocalico container"
            NodeApp[Node.js 20 Alpine<br/>Express Server<br/>Port 3000]
            AppCode[Application Code<br/>server.js<br/>database/db.js<br/>public/*]
            NodeModules[Node Modules<br/>express<br/>better-sqlite3<br/>cors<br/>dotenv]
        end

        subgraph "Data Volume"
            DBVolume[radiocalico-data<br/>SQLite Database<br/>Persistent Storage]
        end
    end

    subgraph "Host Machine"
        Port[Port 3000]
        Docker[Docker Engine]
    end

    Port --> NodeApp
    NodeApp --> AppCode
    NodeApp --> NodeModules
    NodeApp --> DBVolume
    Docker --> NodeApp

    style NodeApp fill:#1F4E23,color:#fff
    style DBVolume fill:#38A29D,color:#fff
```

## CI/CD Pipeline Architecture

```mermaid
graph TB
    subgraph "Trigger Events"
        Push[Git Push to main]
        PR[Pull Request]
        Tag[Version Tag v*]
    end

    subgraph "GitHub Actions Workflow"
        subgraph "Test Job"
            Checkout1[Checkout Code]
            Setup1[Setup Node.js 20]
            Install1[npm ci]
            TestAll[npm test<br/>92 tests]
            TestBack[Backend Tests]
            TestFront[Frontend Tests]
            TestInt[Integration Tests]
            Coverage[Generate Coverage]
            UploadCov[Upload to Codecov]
        end

        subgraph "Security Job"
            Checkout2[Checkout Code]
            Setup2[Setup Node.js 20]
            Install2[npm ci]
            AuditProd[npm audit --production]
            AuditAll[npm audit all deps]
            AuditHigh[Check high/critical]
            Report[Generate Report]
        end

        subgraph "Lint Job"
            Checkout3[Checkout Code]
            Setup3[Setup Node.js 20]
            Install3[npm ci]
            Outdated[Check Outdated]
            DepTree[Dependency Tree]
        end

        subgraph "Build Job"
            Checkout4[Checkout Code]
            Buildx[Setup Docker Buildx]
            Login[Login to GHCR]
            Meta[Extract Metadata]
            BuildScan[Build amd64 Image<br/>for Scanning]
            Trivy[Trivy Scan<br/>CRITICAL,HIGH]
            UploadSec[Upload to Security Tab]
            BuildPush[Build Multi-platform<br/>amd64,arm64]
            Push[Push to GHCR]
        end
    end

    subgraph "Artifacts & Results"
        CovReport[Coverage Reports]
        SecReport[Security Audit Report]
        TrivyReport[Trivy Scan Results]
        DockerImage[Docker Images<br/>ghcr.io/VIVEK-JADHAV/radio-calico]
    end

    Push --> Checkout1
    Push --> Checkout2
    Push --> Checkout3
    PR --> Checkout1
    PR --> Checkout2
    PR --> Checkout3
    Tag --> Checkout1

    Checkout1 --> Setup1 --> Install1 --> TestAll
    TestAll --> TestBack
    TestAll --> TestFront
    TestAll --> TestInt
    TestInt --> Coverage --> UploadCov --> CovReport

    Checkout2 --> Setup2 --> Install2 --> AuditProd
    AuditProd --> AuditAll --> AuditHigh --> Report --> SecReport

    Checkout3 --> Setup3 --> Install3 --> Outdated --> DepTree

    TestAll --> Checkout4
    AuditHigh --> Checkout4
    Checkout4 --> Buildx --> Login --> Meta --> BuildScan
    BuildScan --> Trivy --> UploadSec --> TrivyReport
    UploadSec --> BuildPush
    BuildPush --> Push --> DockerImage

    style TestAll fill:#1F4E23,color:#fff
    style AuditHigh fill:#EFA63C,color:#000
    style Trivy fill:#EFA63C,color:#000
    style Push fill:#38A29D,color:#fff
```

## Security Scanning Flow

```mermaid
graph LR
    subgraph "Dependency Security"
        Code[Source Code]
        NPM[npm audit]
        Vulns[Known Vulnerabilities<br/>CVE Database]
        AuditReport[Audit Report<br/>0 vulnerabilities]
    end

    subgraph "Container Security"
        BuildImg[Docker Image<br/>radiocalico:scan]
        TrivyScan[Trivy Scanner]
        TrivyDB[Vulnerability DB<br/>OS & Packages]
        ScanResults[SARIF Report]
        GitSec[GitHub Security Tab]
    end

    subgraph "Test Coverage"
        Tests[Jest Test Suite<br/>92 tests]
        CovGen[Coverage Report]
        Codecov[Codecov Platform]
    end

    Code --> NPM
    NPM --> Vulns
    Vulns --> AuditReport

    Code --> BuildImg
    BuildImg --> TrivyScan
    TrivyScan --> TrivyDB
    TrivyDB --> ScanResults
    ScanResults --> GitSec

    Code --> Tests
    Tests --> CovGen
    CovGen --> Codecov

    style NPM fill:#EFA63C,color:#000
    style TrivyScan fill:#EFA63C,color:#000
    style Tests fill:#1F4E23,color:#fff
```

## API Endpoint Architecture

```mermaid
graph TB
    subgraph "HTTP Routes"
        Root[GET /<br/>Serve Frontend]
        Health[GET /api/health<br/>Status Check]

        subgraph "User Management"
            GetUsers[GET /api/users<br/>List All Users]
            CreateUser[POST /api/users<br/>Create User]
        end

        subgraph "Rating System"
            GetRatings[GET /api/ratings/:songId<br/>Get Vote Counts]
            CheckRating[GET /api/ratings/:songId/check<br/>Check User Vote]
            SubmitRating[POST /api/ratings<br/>Submit Vote]
        end
    end

    subgraph "Middleware"
        CORS[CORS Handler]
        JSON[JSON Parser]
        URLEncoded[URL Encoded Parser]
        StaticFiles[Static File Server]
        IPDetector[Client IP Detection<br/>x-forwarded-for<br/>x-real-ip]
    end

    subgraph "Database Operations"
        SelectUsers[SELECT * FROM users]
        InsertUser[INSERT INTO users]
        CountRatings[COUNT ratings by song_id]
        CheckDupe[SELECT rating by user+song]
        InsertRating[INSERT INTO song_ratings<br/>UNIQUE constraint]
    end

    CORS --> Root
    CORS --> Health
    CORS --> GetUsers
    CORS --> CreateUser
    CORS --> GetRatings
    CORS --> CheckRating
    CORS --> SubmitRating

    GetUsers --> SelectUsers
    CreateUser --> InsertUser
    GetRatings --> CountRatings
    CheckRating --> IPDetector
    IPDetector --> CheckDupe
    SubmitRating --> IPDetector
    IPDetector --> InsertRating

    style IPDetector fill:#38A29D,color:#fff
    style InsertRating fill:#1F4E23,color:#fff
```

## Data Flow: Song Rating

```mermaid
sequenceDiagram
    participant User as Web Browser
    participant Server as Express Server
    participant IP as IP Detector
    participant DB as SQLite Database

    User->>Server: POST /api/ratings<br/>{songId, rating: 1}
    Server->>IP: Extract Client IP
    IP->>IP: Check x-forwarded-for
    IP->>IP: Fallback to x-real-ip
    IP->>IP: Fallback to socket IP
    IP-->>Server: Client IP: 192.168.1.100

    Server->>DB: Check existing rating<br/>WHERE song_id AND user_id
    DB-->>Server: No existing rating

    Server->>DB: INSERT INTO song_ratings<br/>(song_id, user_id, rating)
    DB-->>Server: Success (id: 42)

    Server->>DB: COUNT thumbs up
    DB-->>Server: 15

    Server->>DB: COUNT thumbs down
    DB-->>Server: 3

    Server-->>User: 201 Created<br/>{thumbsUp: 15, thumbsDown: 3}

    Note over DB: UNIQUE(song_id, user_id)<br/>prevents duplicate votes
```

## Makefile Workflow

```mermaid
graph TB
    subgraph "Development Commands"
        Help[make help<br/>Show all commands]
        Install[make install<br/>npm install]
        Start[make start<br/>npm start]
        Dev[make dev<br/>npm run dev]
    end

    subgraph "Testing Commands"
        Test[make test<br/>npm test]
        TestWatch[make test-watch<br/>Jest watch mode]
        TestCov[make test-coverage<br/>Jest with coverage]
        TestBack[make test-backend]
        TestFront[make test-frontend]
        TestInt[make test-integration]
    end

    subgraph "Security Commands"
        Security[make security<br/>npm audit + npm test]
        Audit[make audit<br/>npm audit]
        AuditFix[make audit-fix<br/>npm audit fix]
        AuditProd[make audit-production<br/>--production flag]
    end

    subgraph "Docker Commands"
        DockerBuild[make docker-build<br/>docker-compose build]
        DockerUp[make docker-up<br/>docker-compose up -d]
        DockerDown[make docker-down<br/>docker-compose down]
        DockerLogs[make docker-logs<br/>docker-compose logs -f]
        DockerClean[make docker-clean<br/>down -v with confirm]
    end

    subgraph "Utility Commands"
        Clean[make clean<br/>Remove generated files]
    end

    Help --> Install
    Install --> Start
    Install --> Test
    Test --> Security
    Security --> DockerBuild
    DockerBuild --> DockerUp

    style Security fill:#EFA63C,color:#000
    style Test fill:#1F4E23,color:#fff
    style DockerUp fill:#38A29D,color:#fff
```

## Deployment Flow

```mermaid
graph TB
    subgraph "Development"
        DevCode[Write Code]
        MakeSecurity[make security<br/>Local Testing]
        Commit[git commit]
    end

    subgraph "CI/CD Pipeline"
        Push[git push]
        Tests[Run 92 Tests]
        Audit[Security Audit]
        Scan[Trivy Scan]
        Build[Build Docker Image]
    end

    subgraph "GitHub Container Registry"
        GHCR[ghcr.io/VIVEK-JADHAV/radio-calico]
        TagMain[main tag]
        TagLatest[latest tag]
        TagVersion[v1.0.0 tag]
    end

    subgraph "Production Deployment"
        Pull[docker pull]
        Run[docker-compose up]
        Monitor[Health Check<br/>/api/health]
    end

    DevCode --> MakeSecurity
    MakeSecurity --> Commit
    Commit --> Push
    Push --> Tests
    Tests --> Audit
    Audit --> Scan
    Scan --> Build
    Build --> GHCR
    GHCR --> TagMain
    GHCR --> TagLatest
    GHCR --> TagVersion
    TagMain --> Pull
    Pull --> Run
    Run --> Monitor

    style MakeSecurity fill:#EFA63C,color:#000
    style Tests fill:#1F4E23,color:#fff
    style GHCR fill:#38A29D,color:#fff
```

## Technology Stack

```mermaid
graph TB
    subgraph "Frontend"
        HTML5[HTML5<br/>Semantic Markup]
        CSS3[CSS3<br/>Brand Guidelines]
        Vanilla[Vanilla JavaScript<br/>No Framework]
        HLSJS[HLS.js<br/>Audio Streaming]
    end

    subgraph "Backend"
        NodeJS[Node.js 20<br/>Runtime]
        ExpressJS[Express 5<br/>Web Framework]
        BetterSQLite[better-sqlite3<br/>Database Driver]
        CORS[cors<br/>Middleware]
        DotEnv[dotenv<br/>Configuration]
    end

    subgraph "Database"
        SQLite3[SQLite 3<br/>Embedded Database]
        Users2[users table]
        Ratings2[song_ratings table]
    end

    subgraph "Testing"
        Jest[Jest 29<br/>Test Framework]
        Supertest[Supertest<br/>API Testing]
        JSDOM[jsdom<br/>DOM Testing]
        TestingLib[Testing Library<br/>DOM Utils]
    end

    subgraph "DevOps"
        Docker[Docker<br/>Containerization]
        DockerCompose[Docker Compose<br/>Orchestration]
        Actions[GitHub Actions<br/>CI/CD]
        Trivy2[Trivy<br/>Security Scanner]
        Make[Makefile<br/>Task Runner]
    end

    HTML5 --> Vanilla
    CSS3 --> Vanilla
    Vanilla --> HLSJS

    NodeJS --> ExpressJS
    ExpressJS --> BetterSQLite
    ExpressJS --> CORS
    NodeJS --> DotEnv

    BetterSQLite --> SQLite3
    SQLite3 --> Users2
    SQLite3 --> Ratings2

    Jest --> Supertest
    Jest --> JSDOM
    Jest --> TestingLib

    Docker --> DockerCompose
    Actions --> Trivy2
    Make --> Docker

    style NodeJS fill:#1F4E23,color:#fff
    style SQLite3 fill:#38A29D,color:#fff
    style Jest fill:#EFA63C,color:#000
```

---

## Architecture Principles

### 1. **Simplicity First**
- No heavy frontend frameworks (React, Vue, Angular)
- Vanilla JavaScript for maximum performance
- SQLite for zero-configuration database
- Single Express server for all routes

### 2. **Security by Default**
- IP-based user identification (privacy-friendly)
- UNIQUE constraints prevent duplicate votes
- npm audit on every build
- Trivy scans all Docker images
- CORS enabled for cross-origin protection

### 3. **Container-Ready**
- Multi-stage Docker builds (optimized size)
- Non-root user (security hardening)
- Health checks built-in
- Volume mounts for data persistence
- Multi-platform support (amd64, arm64)

### 4. **CI/CD Automation**
- Parallel job execution (test, security, lint)
- Automated testing on every commit
- Security scans block deployment on failures
- Multi-platform image builds
- Semantic versioning support

### 5. **Developer Experience**
- Makefile for common tasks
- Comprehensive test coverage (92 tests)
- Clear documentation (README, CLAUDE.md, DOCKER.md)
- Local development mirrors production
- Fast feedback loops (<2 minutes for tests)

## Scalability Considerations

### Current Limitations
- SQLite is single-writer (concurrent writes blocked)
- In-process database (doesn't scale horizontally)
- No caching layer (Redis, Memcached)
- No load balancing
- No CDN for static assets

### Future Enhancements (Not Implemented)
- PostgreSQL for multi-writer support
- nginx reverse proxy for SSL/TLS
- Redis for session storage and caching
- Horizontal scaling with Kubernetes
- CDN integration for static files
