# YAWKS - Corporate PGP Key Management & WKD/WKS Server

YAWKS (Yet Another Web Key Service) is a professional, business-ready OpenPGP key management system. It combines a standard-compliant **Web Key Directory (WKD)** and **Web Key Service (WKS)** with advanced corporate features to ensure security, privacy, and administrative control.

## 🌟 Key Features

### 🏢 Corporate PGP Management
- **Designated Revoker Injection**: Automatically injects a corporate-controlled revocation key into user keys during generation or upload. This allows the organization to revoke keys if a device is lost or an employee leaves.
- **Privacy by Design**: All cryptographic operations involving private keys (generation, re-signing, revoker injection) occur **locally in the user's browser**. Private keys are never transmitted to the server.
- **Ownership Proof**: Every key submission is cryptographically signed by the user's private key, proving possession before registration.

### 💻 Premium User Dashboard
- **Modern Interface**: A sleek, glassmorphism-inspired dark mode dashboard for employees.
- **Key Generator**: One-click PGP key generation with automated corporate compliance.
- **Key Import**: Support for importing existing keys with automated compliance injection.
- **Employee Search**: Searchable directory for colleagues' public keys, integrated with WKD.

### 🛡️ Administrative Controls
- **Admin Dashboard**: A protected management interface for administrators.
- **Centralized Revocation**: Trigger official PGP revocations using the corporate Designated Revoker key.
- **Advanced Authentication**: Admin actions are protected by API-key security.

### 🛰️ WKD/WKS Standard Compliance
- **Full WKD Support**: Implements both "Advanced" and "Direct" discovery methods.
- **RFC Compliance**: Adheres to RFC 4880 and the WKD/WKS drafts.
- **Traffic Analysis Protection**: Implements PGP Padding packets (Tag 21) to normalize response sizes and protect against traffic analysis.
- **User ID Filtering**: Privacy-preserving key delivery that only serves the requested User ID.
- **CORS Support**: Ready for integration with browser plugins like Mailvelope.

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+)
- **NPM**
- **SSL Certificate** (e.g., from Certbot)

### Installation
1. Clone the repository:
   ```bash
   git clone https://github.com/looserouting/yawks.git
   cd yawks
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Prepare the frontend:
   ```bash
   npm run prepare
   ```

### Configuration
1. Copy the example config:
   ```bash
   cp src/config.js.example src/config.js
   ```
2. Edit `src/config.js` to set your domains, corporate revocation key path, and admin keys.

### Running the Server
```bash
node yaws.js
```
The server will automatically generate a submission key and a corporate revocation key upon first start if they don't exist.

## 📁 Project Structure
- `src/controller/`: API logic for WKD, WKS, Search, and Revocation.
- `src/model/`: Database schemas (Sequelize/SQLite).
- `src/service/`: Core services including Mail (Outgoing), HTTPS, and Key Management.
- `src/service/httpsServer/public/`: The premium web dashboard.

## ⚙️ Architecture
YAWKS Corporate Edition is optimized for a modern web workflow:
1. **Key Creation**: User generates or imports a key in the browser.
2. **Submission**: Public key and ownership proof are sent via HTTPS API.
3. **Validation**: Server sends a signed validation email.
4. **Activation**: User clicks the link to publish the key to WKD.
This eliminates the need for complex incoming mail setups (IMAP/SMTP-Listening).

## 📄 License
This project is open-source and available under the MIT License.