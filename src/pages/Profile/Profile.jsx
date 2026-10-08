import { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import { extractErrorMessage } from "../../services/errorHandling";
import {
  getMe,
  updateMe,
  changePassword,
  getShop,
  updateShop,
} from "../../services/profileApi";
import "./Profile.css";

function Profile() {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [me, setMe] = useState(null);
  const [fullName, setFullName] = useState("");
  const [username, setUsername] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [savingPassword, setSavingPassword] = useState(false);

  const [shop, setShop] = useState(null);
  const [shopName, setShopName] = useState("");
  const [shopLocation, setShopLocation] = useState("");
  const [shopCurrency, setShopCurrency] = useState("");
  const [shopPochiNumber, setShopPochiNumber] = useState("");
  const [shopTillNumber, setShopTillNumber] = useState("");
  const [shopPaybillNumber, setShopPaybillNumber] = useState("");
  const [shopPaybillAccountNumber, setShopPaybillAccountNumber] = useState("");
  const [savingShop, setSavingShop] = useState(false);

  useEffect(() => {
    getMe().then((data) => {
      setMe(data);
      setFullName(data.full_name);
      setUsername(data.username);
    });

    if (user?.role === "admin") {
      getShop().then((data) => {
        setShop(data);
        setShopName(data.name);
        setShopLocation(data.location || "");
        setShopCurrency(data.currency);
        setShopPochiNumber(data.mpesa_pochi_number || "");
        setShopTillNumber(data.mpesa_till_number || "");
        setShopPaybillNumber(data.mpesa_paybill_number || "");
        setShopPaybillAccountNumber(data.mpesa_paybill_account_number || "");
      });
    }
  }, [user]);

  async function handleProfileSubmit(e) {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await updateMe({ full_name: fullName, username });
      setMe(updated);
      showToast("Profile updated.", "success");
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setSavingProfile(false);
    }
  }

  async function handlePasswordSubmit(e) {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast("New password and confirmation don't match.", "error");
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword({
        current_password: currentPassword,
        new_password: newPassword,
      });
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      showToast("Password changed.", "success");
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setSavingPassword(false);
    }
  }

  async function handleShopSubmit(e) {
    e.preventDefault();
    setSavingShop(true);
    try {
      const updated = await updateShop({
        name: shopName,
        location: shopLocation || null,
        currency: shopCurrency,
        mpesa_pochi_number: shopPochiNumber || null,
        mpesa_till_number: shopTillNumber || null,
        mpesa_paybill_number: shopPaybillNumber || null,
        mpesa_paybill_account_number: shopPaybillAccountNumber || null,
      });
      setShop(updated);
      setShopPochiNumber(updated.mpesa_pochi_number || "");
      setShopTillNumber(updated.mpesa_till_number || "");
      setShopPaybillNumber(updated.mpesa_paybill_number || "");
      setShopPaybillAccountNumber(updated.mpesa_paybill_account_number || "");
      showToast("Shop settings updated.", "success");
    } catch (err) {
      showToast(extractErrorMessage(err), "error");
    } finally {
      setSavingShop(false);
    }
  }

  if (!me) {
    return (
      <div className="profile-page">
        <div className="profile-loading">
          <div className="profile-loading-spinner" />
          <span>Loading your account...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="profile-page">
      <div className="profile-container">

        {/* Page Header */}
        <header className="profile-header">
          <div>
            <div className="profile-eyebrow">ACCOUNT CENTER</div>
            <h1>Profile & Settings</h1>
            <p>
              Manage your personal details, account security, and shop
              information from one place.
            </p>
          </div>

          <div className="profile-header-badge">
            <div className="profile-avatar">
              {fullName?.charAt(0)?.toUpperCase() || "U"}
            </div>

            <div>
              <strong>{fullName}</strong>
              <span>{me.role}</span>
            </div>
          </div>
        </header>

        {/* Quick Overview */}
        <div className="profile-overview">
          <div className="overview-item">
            <div className="overview-icon">👤</div>
            <div>
              <span>Account</span>
              <strong>Personal details</strong>
            </div>
          </div>

          <div className="overview-divider" />

          <div className="overview-item">
            <div className="overview-icon">🔐</div>
            <div>
              <span>Security</span>
              <strong>Password protection</strong>
            </div>
          </div>

          {user?.role === "admin" && (
            <>
              <div className="overview-divider" />

              <div className="overview-item">
                <div className="overview-icon">🏪</div>
                <div>
                  <span>Business</span>
                  <strong>Shop information</strong>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Personal Details */}
        <section className="profile-card">
          <div className="profile-card-header">
            <div className="section-icon personal-icon">👤</div>

            <div>
              <h2>Your Details</h2>
              <p>
                Keep your account information accurate so your Duka POS
                profile stays up to date.
              </p>
            </div>
          </div>

          <div className="profile-card-content">
            <form onSubmit={handleProfileSubmit}>
              <div className="form-grid">
                <div className="profile-field">
                  <label htmlFor="profile-full-name">Full name</label>
                  <input
                    id="profile-full-name"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    required
                  />
                  <span className="field-hint">
                    The name associated with your account.
                  </span>
                </div>

                <div className="profile-field">
                  <label htmlFor="profile-username">Username</label>
                  <input
                    id="profile-username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    required
                    minLength={3}
                  />
                  <span className="field-hint">
                    Used to identify and access your account.
                  </span>
                </div>
              </div>

              <div className="account-role">
                <span className="role-label">ACCOUNT ROLE</span>
                <span className="role-badge">
                  {me.role}
                </span>
                <span className="role-description">
                  Your role determines the areas of the system you can access.
                </span>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="primary-button"
                  disabled={savingProfile}
                >
                  {savingProfile ? "Saving..." : "Save Profile Changes"}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Password */}
        <section className="profile-card">
          <div className="profile-card-header">
            <div className="section-icon security-icon">🔐</div>

            <div>
              <h2>Account Security</h2>
              <p>
                Change your password regularly to help keep your account
                protected.
              </p>
            </div>
          </div>

          <div className="profile-card-content">
            <form onSubmit={handlePasswordSubmit}>
              <div className="security-notice">
                <span className="security-notice-icon">✓</span>
                <div>
                  <strong>Password protection</strong>
                  <p>
                    Choose a password that is difficult for others to guess
                    and avoid sharing it with other staff members.
                  </p>
                </div>
              </div>

              <div className="form-grid password-grid">
                <div className="profile-field full-width">
                  <label htmlFor="current-password">
                    Current password
                  </label>
                  <input
                    id="current-password"
                    type="password"
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    required
                    autoComplete="current-password"
                  />
                </div>

                <div className="profile-field">
                  <label htmlFor="new-password">New password</label>
                  <input
                    id="new-password"
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                  <span className="field-hint">
                    Minimum 6 characters.
                  </span>
                </div>

                <div className="profile-field">
                  <label htmlFor="confirm-password">
                    Confirm new password
                  </label>
                  <input
                    id="confirm-password"
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    required
                    minLength={6}
                    autoComplete="new-password"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="secondary-button"
                  disabled={savingPassword}
                >
                  {savingPassword ? "Saving..." : "Update Password"}
                </button>
              </div>
            </form>
          </div>
        </section>

        {/* Shop Settings - Admin Only */}
        {user?.role === "admin" && shop && (
          <section className="profile-card shop-card">
            <div className="profile-card-header">
              <div className="section-icon shop-icon">🏪</div>

              <div>
                <div className="section-label">ADMINISTRATOR</div>
                <h2>Shop Settings</h2>
                <p>
                  Manage the business information displayed and used by
                  your retail system.
                </p>
              </div>
            </div>

            <div className="profile-card-content">
              <div className="shop-summary">
                <div className="shop-summary-mark">
                  {shopName?.charAt(0)?.toUpperCase() || "S"}
                </div>

                <div>
                  <span>Your business</span>
                  <strong>{shopName || "Shop"}</strong>
                  <small>
                    {shopLocation || "Location not specified"}
                  </small>
                </div>
              </div>

              <form onSubmit={handleShopSubmit}>
                <div className="form-grid">
                  <div className="profile-field">
                    <label htmlFor="shop-name">Shop name</label>
                    <input
                      id="shop-name"
                      value={shopName}
                      onChange={(e) => setShopName(e.target.value)}
                      required
                      minLength={2}
                    />
                    <span className="field-hint">
                      The name of your retail business.
                    </span>
                  </div>

                  <div className="profile-field">
                    <label htmlFor="shop-location">Location</label>
                    <input
                      id="shop-location"
                      value={shopLocation}
                      onChange={(e) => setShopLocation(e.target.value)}
                      placeholder="e.g. Nairobi"
                    />
                    <span className="field-hint">
                      Your shop's general location.
                    </span>
                  </div>

                  <div className="profile-field currency-field">
                    <label htmlFor="shop-currency">Currency</label>
                    <div className="currency-input">
                      <input
                        id="shop-currency"
                        value={shopCurrency}
                        onChange={(e) =>
                          setShopCurrency(e.target.value.toUpperCase())
                        }
                        maxLength={3}
                        required
                      />
                      <span>3-letter code</span>
                    </div>
                    <span className="field-hint">
                      Example: KES
                    </span>
                  </div>
                  <div className="profile-field">
                    <label htmlFor="shop-mpesa-pochi">Pochi la Biashara number</label>
                    <input
                      id="shop-mpesa-pochi"
                      value={shopPochiNumber}
                      onChange={(e) => setShopPochiNumber(e.target.value)}
                      maxLength={50}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="profile-field">
                    <label htmlFor="shop-mpesa-till">Buy Goods Till number</label>
                    <input
                      id="shop-mpesa-till"
                      value={shopTillNumber}
                      onChange={(e) => setShopTillNumber(e.target.value)}
                      maxLength={50}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="profile-field">
                    <label htmlFor="shop-mpesa-paybill">PayBill business number</label>
                    <input
                      id="shop-mpesa-paybill"
                      value={shopPaybillNumber}
                      onChange={(e) => setShopPaybillNumber(e.target.value)}
                      maxLength={50}
                      placeholder="Optional"
                    />
                  </div>

                  <div className="profile-field">
                    <label htmlFor="shop-mpesa-account">PayBill account number</label>
                    <input
                      id="shop-mpesa-account"
                      value={shopPaybillAccountNumber}
                      onChange={(e) => setShopPaybillAccountNumber(e.target.value)}
                      maxLength={100}
                      placeholder="Required when PayBill is configured"
                    />
                  </div>
                </div>

                <div className="business-note">
                  <span>💡</span>
                  <p>
                    Cashiers can use configured payment details at checkout.
                    PayBill requires both a business number and an account number.
                  </p>
                </div>

                <div className="form-actions">
                  <button
                    type="submit"
                    className="primary-button"
                    disabled={savingShop}
                  >
                    {savingShop
                      ? "Saving..."
                      : "Save Shop Settings"}
                  </button>
                </div>
              </form>
            </div>
          </section>
        )}

        <div className="profile-footer">
          <span>DUKA POS</span>
          <p>Your account and shop settings are managed securely.</p>
        </div>
      </div>
    </div>
  );
}

export default Profile;