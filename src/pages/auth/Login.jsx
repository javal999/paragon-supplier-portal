/** @import React from 'react' */
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCurrentIdentity } from '@context/CurrentIdentityContext';
import { mockSuppliers } from '@data/mockSuppliers';
import { SEEDED_SEAT_ROLES } from '@services/transitions/businessRoles';
import { NO_PERSON } from '@context/noPerson';

const NAVY = 'var(--pds-color-text-primary)';
const TEAL = 'var(--pds-color-accent)';
// BL-84 (WCAG 1.4.3): the page shipped #94A3B8 for four text runs — 2.6:1 on
// white, below the 4.5:1 AA floor. The light-theme secondary token is #5c5c5c
// (6.7:1 on white) and is the same "muted" role the grey was doing.
const MUTED = 'var(--pds-color-text-secondary)';
// The footer sits on the dark navy page background, where the light-theme
// secondary token is unreadable (#5c5c5c on rgb(42,61,74) is 1.6:1). The
// dark-theme secondary value is 8:1 on that background.
const FOOTER_TEXT = '#d3dae1';

const SEED_SUPPLIER_ID = 'sup-007';
const SEED_SUPPLIER_NAME = mockSuppliers.find((s) => s.id === SEED_SUPPLIER_ID)?.name ?? null;

/** @type {React.CSSProperties} */
const INPUT_STYLE = {
  width: '100%',
  padding: '10px 12px',
  border: '1px solid var(--pds-color-border-strong)',
  borderRadius: '6px',
  fontSize: '14px',
  fontFamily: 'inherit',
  color: NAVY,
  background: 'white',
  boxSizing: 'border-box',
  outline: 'none'
};

/** @type {React.FC} */
const Login = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { setIdentity } = useCurrentIdentity();
  const [activeTab, setActiveTab] = useState(/** @type {'buyer' | 'supplier'} */ ('buyer'));
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signInAsBuyer = () => {
    setIdentity({
      personaType: 'buyer',
      supplierId: null,
      supplierName: null,
      businessRoles: SEEDED_SEAT_ROLES.buyer,
      actor: NO_PERSON
    });
    navigate('/buyer/home');
  };

  const signInAsSupplier = () => {
    setIdentity({
      personaType: 'supplier',
      supplierId: SEED_SUPPLIER_ID,
      supplierName: SEED_SUPPLIER_NAME,
      businessRoles: SEEDED_SEAT_ROLES.supplier,
      actor: NO_PERSON
    });
    navigate('/supplier/home');
  };

  const handleSignIn = () => {
    if (activeTab === 'buyer') signInAsBuyer();
    else signInAsSupplier();
  };

  const handleViewAsBuyer = signInAsBuyer;
  const handleViewAsSupplier = signInAsSupplier;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: NAVY,
        padding: '2rem 1rem'
      }}
    >
      {/* Card */}
      <div
        style={{
          background: 'white',
          width: '100%',
          maxWidth: '400px',
          borderRadius: '12px',
          padding: '40px',
          boxShadow: 'var(--shadow-strong)'
        }}
      >
        {/* Logo + brand — BL-84 (WCAG 1.3.1): the page had no heading at all.
            Its one h1 is the product name, styled where the brand line sat. */}
        <div style={{ textAlign: 'center', marginBottom: '28px' }}>
          <div
            style={{
              width: '48px',
              height: '48px',
              borderRadius: '50%',
              background: TEAL,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 12px'
            }}
          >
            <span style={{ color: 'white', fontWeight: 700, fontSize: '22px' }}>P</span>
          </div>
          <div style={{ fontWeight: 700, fontSize: '16px', color: NAVY, letterSpacing: '0.05em' }}>
            PARAGON CORP
          </div>
          <h1
            style={{
              fontWeight: 600,
              fontSize: '13px',
              color: TEAL,
              margin: '2px 0 0',
              lineHeight: 1.4
            }}
          >
            {t('login.title')}
          </h1>
          <div style={{ color: MUTED, fontSize: '12px', fontStyle: 'italic', marginTop: '6px' }}>
            {t('login.brandLine2')}
          </div>
        </div>

        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            borderBottom: '1px solid var(--pds-color-border-default)',
            marginBottom: '24px'
          }}
        >
          {
            /** @type {const} */ ([
              ['buyer', 'login.tab.buyer'],
              ['supplier', 'login.tab.supplier']
            ]).map(([tab, labelKey]) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                style={{
                  flex: 1,
                  padding: '10px 0',
                  border: 'none',
                  background: 'transparent',
                  cursor: 'pointer',
                  fontSize: '13px',
                  fontWeight: activeTab === tab ? 700 : 500,
                  color: activeTab === tab ? (tab === 'buyer' ? NAVY : TEAL) : MUTED,
                  borderBottom:
                    activeTab === tab
                      ? `2px solid ${tab === 'buyer' ? NAVY : TEAL}`
                      : '2px solid transparent',
                  marginBottom: '-1px',
                  fontFamily: 'inherit',
                  transition: 'all 0.15s'
                }}
              >
                {t(labelKey)}
              </button>
            ))
          }
        </div>

        {/* Form */}
        <div
          style={{ display: 'flex', flexDirection: 'column', gap: '14px', marginBottom: '20px' }}
        >
          <div>
            <label className="block">
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--pds-color-text-secondary)',
                  display: 'block',
                  marginBottom: '5px'
                }}
              >
                {t('login.email')}
              </span>
              <input
                type="email"
                style={INPUT_STYLE}
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
              />
            </label>
          </div>
          <div>
            <label className="block">
              <span
                style={{
                  fontSize: '12px',
                  fontWeight: 600,
                  color: 'var(--pds-color-text-secondary)',
                  display: 'block',
                  marginBottom: '5px'
                }}
              >
                {t('login.password')}
              </span>
              <input
                type="password"
                style={INPUT_STYLE}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSignIn()}
              />
            </label>
          </div>

          <button
            onClick={handleSignIn}
            style={{
              width: '100%',
              padding: '11px',
              border: 'none',
              borderRadius: '6px',
              background: activeTab === 'buyer' ? NAVY : TEAL,
              color: 'white',
              fontSize: '14px',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
              marginTop: '2px',
              letterSpacing: '0.02em'
            }}
          >
            {t('login.signIn')}
          </button>

          <div
            style={{
              display: 'flex',
              justifyContent: activeTab === 'buyer' ? 'flex-end' : 'space-between',
              alignItems: 'center'
            }}
          >
            {activeTab === 'supplier' && (
              <button
                onClick={() => navigate('/register')}
                style={{
                  border: 'none',
                  background: 'none',
                  cursor: 'pointer',
                  color: TEAL,
                  fontSize: '12px',
                  fontWeight: 500,
                  fontFamily: 'inherit',
                  padding: 0
                }}
              >
                {t('login.register')}
              </button>
            )}
            <button
              style={{
                border: 'none',
                background: 'none',
                cursor: 'pointer',
                color: MUTED,
                fontSize: '12px',
                fontFamily: 'inherit',
                padding: 0
              }}
              onClick={() => {}}
            >
              {t('login.forgot')}
            </button>
          </div>
        </div>

        {/* Divider — the demo notice. BL-84: it was an English literal in both
            locales; it now reads from the active locale. */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
          <div style={{ flex: 1, height: '1px', background: 'var(--pds-color-border-default)' }} />
          <span style={{ fontSize: '11px', color: MUTED, whiteSpace: 'nowrap', fontWeight: 500 }}>
            {t('login.demoMode')}
          </span>
          <div style={{ flex: 1, height: '1px', background: 'var(--pds-color-border-default)' }} />
        </div>

        {/* Demo buttons */}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button
            onClick={handleViewAsBuyer}
            style={{
              flex: 1,
              padding: '9px',
              border: `1.5px solid var(--pds-color-border-strong)`,
              borderRadius: '6px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              color: NAVY,
              fontFamily: 'inherit',
              transition: 'border-color 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = NAVY)}
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = 'var(--pds-color-border-strong)')
            }
          >
            {t('login.viewAsBuyer')}
          </button>
          <button
            onClick={handleViewAsSupplier}
            style={{
              flex: 1,
              padding: '9px',
              border: `1.5px solid var(--pds-color-border-strong)`,
              borderRadius: '6px',
              background: 'white',
              cursor: 'pointer',
              fontSize: '12px',
              fontWeight: 600,
              color: NAVY,
              fontFamily: 'inherit',
              transition: 'border-color 0.15s'
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = TEAL)}
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = 'var(--pds-color-border-strong)')
            }
          >
            {t('login.viewAsSupplier')}
          </button>
        </div>
      </div>

      {/* Footer — on the navy page background, so it uses a light ink. */}
      <div
        style={{
          marginTop: '24px',
          fontSize: '11px',
          color: FOOTER_TEXT,
          textAlign: 'center'
        }}
      >
        {t('login.footer')}
      </div>
    </div>
  );
};

export default Login;
