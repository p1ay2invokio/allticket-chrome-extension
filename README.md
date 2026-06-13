# AllTicket Bot - Chrome Extension

![TypeScript](https://img.shields.io/badge/TypeScript-89%25-3178c6?style=flat-square)
![CSS](https://img.shields.io/badge/CSS-10.3%25-563d7c?style=flat-square)
![React](https://img.shields.io/badge/React-Vite-61dafb?style=flat-square)
![License](https://img.shields.io/badge/License-Personal%20Use-blue?style=flat-square)

## 🎯 Project Overview

**AllTicket Bot** is a powerful Chrome Extension designed to automate and streamline ticket booking for concerts, theater shows, and other live events on the AllTicket platform. Whether you want fully automated booking or prefer manual seat selection, this extension gives you complete control over the ticket purchasing process.

<img width="1616" height="847" alt="Screenshot 2569-06-11 at 17 44 20" src="https://github.com/user-attachments/assets/f3cf8770-d9f6-471a-9a9f-7d8231ad145f" />
<img width="1616" height="847" alt="Screenshot 2569-06-11 at 17 44 34" src="https://github.com/user-attachments/assets/659cc214-74da-4aa9-8732-c508632cdab4" />
<img width="1616" height="847" alt="Screenshot 2569-06-11 at 17 44 43" src="https://github.com/user-attachments/assets/3c39d381-c14d-468e-84eb-2ca001eb8f8f" />
<img width="1616" height="847" alt="Screenshot 2569-06-11 at 17 44 51" src="https://github.com/user-attachments/assets/a0a973f7-a8af-4de9-97ee-b774cfb789d2" />
<img width="1616" height="847" alt="Screenshot 2569-06-11 at 17 45 37" src="https://github.com/user-attachments/assets/4eb1d03c-9f44-4161-b211-96472471e03d" />




---

## ✨ Key Features

### 🤖 Auto-Booking Mode
- **Fully Automated Booking** - Book tickets with zero manual intervention
- **Flexible Quantity** - Select desired number of tickets (typically 1-4 based on system limits)
- **Smart Zone Selection** - Automatically pick optimal seating zones or let the system choose
- **Toggle Option** - Enable/disable auto-booking as needed

### 🎫 Manual Booking Mode
- **Real-Time Seat Map** - Interactive visualization of available seats
- **Precise Selection** - Hand-pick individual seats with exact positioning
- **Multi-Zone Support** - Works with both traditional seated areas and standing room zones
- **Price Display** - View ticket prices and details for each zone

### 🧩 Quiz Auto-Solver
- **Anti-Bot Challenge Detection** - Automatically detects and solves quiz challenges
- **JWT Timer Decoding** - Calculates anti-bot wait times using JWT token analysis
- **Fallback Manual Mode** - Option to solve quizzes manually if auto-solve fails
- **Intelligent Retry Logic** - Cycles through multiple answer options intelligently

### 🔐 Authentication & Storage Management
- **Auto Token Extraction** - Automatically captures Authorization tokens from browser storage
- **Event ID Detection** - Identifies and extracts Performance IDs automatically
- **Consent Management** - Handles consent IDs for legal compliance
- **Dual Storage Support** - Manages both localStorage and sessionStorage seamlessly

### 🔧 Developer Console & Logging
- **Detailed Logging** - Comprehensive log entries for every action
- **Storage Inspector** - View complete browser storage (localStorage & sessionStorage)
- **Search & Filter** - Search and filter storage data in real-time
- **One-Click Export** - Copy logs and storage data to clipboard instantly

### 📊 Real-Time Status Tracking
- **Live Status Updates** - Monitor booking progress with live status messages
- **Polling Loop** - Continuously check booking confirmation status
- **UUID Tracking** - Track booking requests with unique identifiers
- **API Response Display** - View complete API responses for debugging

---

## 📖 How to Use

### Step 1: Extract Token & Event Information
1. Open the extension on an AllTicket event page
2. Navigate to **Configuration Settings**
3. Click **"1. Get Round API"** to automatically extract Authorization Token and Event ID

### Step 2: Select Show Date / Performance
1. If multiple performances are available, you'll see them listed under "Select Show Date / Location"
2. Choose your preferred show date and location
3. System will load available time slots automatically

### Step 3: Choose Concert Round (Time Slot)
1. Select your preferred round/time slot from the list
2. Click **"3. Get Seat Available API"** to fetch available zones

### Step 4: Select Zone
1. View all available zones with remaining seat counts
2. Click the zone you want to book
3. Zones show real-time availability status

### Step 5: View Seat Map & Book
**For Auto Mode:**
- System automatically selects optimal seats
- Click **"🚀 Start Automated Booking"** to proceed

**For Manual Mode:**
- Click **"5. Get Seat Detail"** to view the full seat map
- Click available seats (green) to select them (max 4 typically)
- Selected seats turn red/highlighted

### Step 6: Confirm & Reserve Tickets
- **Auto Mode**: System automatically proceeds with reservation
- **Manual Mode**: Review selected seats and click **"RESERVE SEATS NOW"**
- Monitor live status updates during booking process

---

## 🛠️ Technical Stack

### Frontend Architecture
- **React 18** + **TypeScript** - Type-safe UI framework with modern React features
- **Vite** - Lightning-fast build tool and development server
- **Chrome Extension APIs** - Direct browser integration and tab scripting
- **CSS3** - Custom properties for dynamic theming

### Project Structure
```
src/
├── App.tsx                 # Main application component (~1,500+ lines)
│   ├── State Management    # 30+ React useState hooks
│   ├── API Integration     # Chrome extension API calls
│   ├── UI Components       # Form controls, modals, cards
│   └── Business Logic      # Booking workflow, quiz solving
├── methods/
│   └── allticket.methods   # AllTicket API client functions
├── App.css                 # Component styling
├── output.css              # Global CSS utilities
└── main.tsx               # React entry point
```

### Key Technologies

| Component | Technology | Purpose |
|-----------|-----------|---------|
| UI Framework | React 18 | Interactive user interface |
| Language | TypeScript | Type safety and code reliability |
| Build Tool | Vite | Fast development & production builds |
| Browser API | Chrome Extension API | Tab scripting and storage access |
| Styling | CSS3 + Custom Props | Modern, responsive design |
| JWT Handling | Custom Decoder | Anti-bot timer decoding |
| DOM Parsing | DOMParser API | HTML ticket label extraction |

---

## 📊 Project Statistics

| Metric | Value |
|--------|-------|
| TypeScript | 89% |
| CSS | 10.3% |
| Other | 0.7% |
| Main Component LOC | 1,500+ |
| Total State Variables | 30+ |
| Supported Booking Modes | 2 (Auto & Manual) |

---

## 🚀 Installation & Setup

### Prerequisites
- Node.js 16 or higher
- npm or yarn package manager
- Chrome/Chromium-based browser

### Development Setup

**1. Clone the repository**
```bash
git clone https://github.com/p1ay2invokio/allticket-chrome-extension.git
cd allticket-chrome-extension
```

**2. Install dependencies**
```bash
npm install
```

**3. Start development server**
```bash
npm run dev
```

**4. Build for production**
```bash
npm run build
```

### Load Extension in Chrome

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **"Developer mode"** (toggle in top right)
3. Click **"Load unpacked"**
4. Select the `dist/` folder from the project
5. Extension will appear in your Chrome toolbar

---

## ⚙️ Configuration

### Required Information
- **Authorization Token** - Extract from AllTicket website automatically or paste manually
- **Perform ID (Event ID)** - Unique identifier for the event
- **Consent ID** - Required for legal compliance (default: SF1)
- **atk-z-data** - Extracted automatically from session storage

### Optional Settings
- **Auto-Solve Quiz** - Toggle automatic quiz solving on/off
- **Booking Mode** - Choose between auto and manual modes
- **Seat Quantity** - Specify number of tickets (respects system limits)
- **Zone Selection** - Auto-select or manual zone selection

---

## ⚠️ Important Disclaimers

🚨 **Use at Your Own Risk** - This extension may violate AllTicket's Terms of Service

**Legal Considerations:**
- ⚠️ Using automation bots may be prohibited by AllTicket's Terms of Service
- 🔐 **Never share your Authorization Token** - Treat it like a password
- ⏱️ **Rate Limiting** - AllTicket may block your IP or account if overused
- 📋 **Personal Use Only** - Use this extension for legitimate personal purposes only
- 🚫 **Not for Resale** - Do not use for bulk ticket purchases or resale
- 🔒 **Respect Systems** - Understand the consequences of automated booking

**Best Practices:**
- Book tickets during normal browsing hours, not in bulk
- Respect queue systems and anti-bot protections
- Use reasonable intervals between bookings
- Follow AllTicket's community guidelines

---

## 🐛 Troubleshooting

### Common Issues

**Token not extracting automatically?**
- Make sure you're logged into AllTicket
- Manually paste your Authorization token
- Check browser console for errors (F12)

**Quiz auto-solver failing?**
- Check anti-bot timer in debug logs
- Try manual quiz answering
- Verify internet connection stability

**Seats not available?**
- Zone might be fully booked
- Try refreshing and selecting different zones
- Check if tickets are still on sale

**Booking fails?**
- Verify all required fields are filled
- Check your token hasn't expired
- Review error message in status box
- Check browser console (F12) for detailed errors

---

## 🔍 Debug Mode

The integrated Developer Console provides:
- **Real-time Logs** - Every action is logged with timestamps
- **Storage Inspector** - View all localStorage and sessionStorage data
- **Search Functionality** - Find specific keys/values quickly
- **Export Tools** - Copy logs or storage data to clipboard
- **Raw API Responses** - See complete server responses

**Access Debug Console:**
- Look for "Developer Console" panel on the right sidebar
- Switch between "Logs" and "Storage" tabs
- Use search box to filter data

---

## 🤝 Contributing

Issues and suggestions are welcome! If you encounter bugs or have feature requests:

1. Check existing issues on GitHub
2. Provide detailed reproduction steps
3. Include browser version and OS information
4. Attach debug logs if relevant

---

## 📄 License

**Personal Use Only** - This project is intended for personal, non-commercial use only.

---

## 👨‍💻 Author

**Sungjintwo** - AllTicket Bot Developer

---

## 🔗 Resources

- [Chrome Extension Documentation](https://developer.chrome.com/docs/extensions/)
- [React Documentation](https://react.dev)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Vite Documentation](https://vitejs.dev)

---

## 📝 Changelog

### v1.0.0 (Current)
- ✅ Full auto-booking functionality
- ✅ Manual seat selection with interactive map
- ✅ Quiz auto-solver with JWT timer support
- ✅ Developer console with real-time logging
- ✅ Storage inspection and search tools
- ✅ Support for multiple zones (seated & standing room)
- ✅ Real-time booking status tracking
- ✅ One-click data export to clipboard

---

## 📧 Support

For issues or questions, please open a GitHub Issue on the [repository](https://github.com/p1ay2invokio/allticket-chrome-extension).

---

**⭐ If you find this project helpful, please consider giving it a star on GitHub!**