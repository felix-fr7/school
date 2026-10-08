/**
 * Pure React Web UI Library
 * Replaces @ionic/react with modern, lightweight web components.
 * 100% native DOM elements with zero Ionic framework / Capacitor dependencies.
 */

import React, { useEffect, useState, useRef } from 'react';
import { useHistory } from 'react-router-dom';

/* =========================================================================
   Layout Containers
   ========================================================================= */

export const WebPage = ({ children, className = '', style = {}, ...props }) => (
  <div className={`web-page ion-page ${className}`} style={style} {...props}>
    {children}
  </div>
);
export const IonPage = WebPage;

export const WebContent = ({ children, className = '', style = {}, fullscreen, scrollY = true, ...props }) => (
  <main
    className={`web-content ion-content ${fullscreen ? 'content-fullscreen' : ''} ${className}`}
    style={{
      overflowY: scrollY ? 'auto' : 'hidden',
      flex: 1,
      width: '100%',
      position: 'relative',
      ...style,
    }}
    {...props}
  >
    {children}
  </main>
);
export const IonContent = WebContent;

export const WebHeader = ({ children, className = '', style = {}, collapse, ...props }) => (
  <header className={`web-header ion-header ${className}`} style={style} {...props}>
    {children}
  </header>
);
export const IonHeader = WebHeader;

export const WebToolbar = ({ children, className = '', style = {}, color, ...props }) => (
  <div className={`web-toolbar ion-toolbar ${color ? 'toolbar-' + color : ''} ${className}`} style={style} {...props}>
    {children}
  </div>
);
export const IonToolbar = WebToolbar;

export const WebTitle = ({ children, className = '', size, ...props }) => (
  <h1 className={`web-title ion-title ${size ? 'title-' + size : ''} ${className}`} {...props}>
    {children}
  </h1>
);
export const IonTitle = WebTitle;

export const IonButtons = ({ children, slot = 'start', className = '', ...props }) => (
  <div className={`web-buttons ion-buttons slot-${slot} ${className}`} {...props}>
    {children}
  </div>
);

export const IonBackButton = ({ defaultHref = '/', text = 'Back', className = '', ...props }) => {
  let history;
  try {
    history = useHistory();
  } catch (e) {
    history = null;
  }
  const handleClick = () => {
    if (history && history.length > 1) {
      history.goBack();
    } else if (history) {
      history.push(defaultHref);
    } else {
      window.history.back();
    }
  };
  return (
    <button type="button" onClick={handleClick} className={`web-back-button ion-back-button ${className}`} {...props}>
      <span className="back-arrow">←</span> {text}
    </button>
  );
};

export const IonApp = ({ children, className = '', ...props }) => (
  <div className={`web-app-root ${className}`} {...props}>
    {children}
  </div>
);

export const IonSplitPane = ({ children, contentId = 'main-content', className = '', ...props }) => (
  <div className={`web-split-pane ${className}`} id={contentId} {...props}>
    {children}
  </div>
);

export const IonRouterOutlet = ({ children, className = '', ...props }) => (
  <div className={`web-router-outlet ${className}`} {...props}>
    {children}
  </div>
);

export const IonText = ({ children, color, className = '', ...props }) => (
  <span className={`web-text ${color ? 'text-' + color : ''} ${className}`} {...props}>
    {children}
  </span>
);

/* =========================================================================
   Grid System
   ========================================================================= */

export const IonGrid = ({ children, fixed, className = '', ...props }) => (
  <div className={`web-grid ion-grid ${fixed ? 'grid-fixed' : ''} ${className}`} {...props}>
    {children}
  </div>
);

export const IonRow = ({ children, className = '', ...props }) => (
  <div className={`web-row ion-row ${className}`} {...props}>
    {children}
  </div>
);

export const IonCol = ({ children, size, sizeSm, sizeMd, sizeLg, className = '', ...props }) => {
  const classes = [
    'web-col',
    'ion-col',
    size ? `col-${size}` : '',
    sizeSm ? `col-sm-${sizeSm}` : '',
    sizeMd ? `col-md-${sizeMd}` : '',
    sizeLg ? `col-lg-${sizeLg}` : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

/* =========================================================================
   Buttons & Interactive
   ========================================================================= */

export const WebButton = React.forwardRef(({
  children,
  className = '',
  expand,
  fill,
  color,
  size,
  type = 'button',
  disabled,
  onClick,
  routerLink,
  slot,
  ...props
}, ref) => {
  let history;
  try {
    history = useHistory();
  } catch (e) {
    history = null;
  }

  const handleClick = (e) => {
    if (disabled) return;
    if (routerLink && history) {
      history.push(routerLink);
    }
    onClick?.(e);
  };

  const classes = [
    'web-button',
    'ion-button',
    expand ? `button-expand-${expand}` : '',
    fill ? `button-fill-${fill}` : '',
    color ? `button-color-${color}` : '',
    size ? `button-size-${size}` : '',
    slot ? `slot-${slot}` : '',
    className,
  ].filter(Boolean).join(' ');

  return (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      onClick={handleClick}
      className={classes}
      {...props}
    >
      {children}
    </button>
  );
});
export const IonButton = WebButton;

/* =========================================================================
   Icons
   ========================================================================= */

export const WebIcon = ({ icon, src, name, className = '', style = {}, slot, ...props }) => {
  const iconData = icon || src || name;
  if (!iconData) return null;

  if (typeof iconData === 'string') {
    if (iconData.startsWith('data:image/svg+xml')) {
      const stripped = iconData
        .replace(/^data:image\/svg\+xml;utf8,/, '')
        .replace(/^data:image\/svg\+xml;charset=utf-8,/, '');
      let rawSvg;
      try {
        rawSvg = decodeURIComponent(stripped);
      } catch (e) {
        rawSvg = stripped;
      }
      return (
        <span
          className={`web-icon ion-icon ${slot ? 'slot-' + slot : ''} ${className}`}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '1.25em',
            height: '1.25em',
            verticalAlign: 'middle',
            fill: 'currentColor',
            stroke: 'currentColor',
            ...style,
          }}
          dangerouslySetInnerHTML={{ __html: rawSvg }}
          {...props}
        />
      );
    }

    return (
      <img
        src={iconData}
        className={`web-icon ion-icon ${slot ? 'slot-' + slot : ''} ${className}`}
        style={{ width: '1.25em', height: '1.25em', verticalAlign: 'middle', ...style }}
        alt=""
        {...props}
      />
    );
  }

  if (React.isValidElement(iconData)) {
    return iconData;
  }

  return null;
};
export const IonIcon = WebIcon;

/* =========================================================================
   Cards
   ========================================================================= */

export const IonCard = ({ children, className = '', onClick, ...props }) => (
  <div className={`web-card ion-card ${className}`} onClick={onClick} {...props}>
    {children}
  </div>
);

export const IonCardHeader = ({ children, className = '', ...props }) => (
  <div className={`web-card-header ion-card-header ${className}`} {...props}>
    {children}
  </div>
);

export const IonCardTitle = ({ children, className = '', ...props }) => (
  <h2 className={`web-card-title ion-card-title ${className}`} {...props}>
    {children}
  </h2>
);

export const IonCardSubtitle = ({ children, className = '', ...props }) => (
  <h4 className={`web-card-subtitle ion-card-subtitle ${className}`} {...props}>
    {children}
  </h4>
);

export const IonCardContent = ({ children, className = '', ...props }) => (
  <div className={`web-card-content ion-card-content ${className}`} {...props}>
    {children}
  </div>
);

/* =========================================================================
   Lists & Items
   ========================================================================= */

export const IonList = ({ children, className = '', inset, ...props }) => (
  <div className={`web-list ion-list ${inset ? 'list-inset' : ''} ${className}`} {...props}>
    {children}
  </div>
);

export const IonListHeader = ({ children, className = '', ...props }) => (
  <div className={`web-list-header ion-list-header ${className}`} {...props}>
    {children}
  </div>
);

export const IonItem = ({
  children,
  className = '',
  routerLink,
  onClick,
  button,
  lines,
  color,
  ...props
}) => {
  let history;
  try {
    history = useHistory();
  } catch (e) {
    history = null;
  }

  const handleClick = (e) => {
    if (routerLink && history) {
      history.push(routerLink);
    }
    onClick?.(e);
  };

  const isClickable = button || !!routerLink || !!onClick;

  return (
    <div
      className={`web-item ion-item ${isClickable ? 'item-clickable' : ''} ${lines ? 'lines-' + lines : ''} ${color ? 'item-' + color : ''} ${className}`}
      onClick={handleClick}
      role={isClickable ? 'button' : undefined}
      tabIndex={isClickable ? 0 : undefined}
      {...props}
    >
      {children}
    </div>
  );
};

export const IonItemSliding = ({ children, className = '', ...props }) => (
  <div className={`web-item-sliding ion-item-sliding ${className}`} {...props}>
    {children}
  </div>
);

export const IonItemOptions = ({ children, side = 'end', className = '', ...props }) => (
  <div className={`web-item-options ion-item-options side-${side} ${className}`} {...props}>
    {children}
  </div>
);

export const IonItemOption = ({ children, color, onClick, className = '', ...props }) => (
  <button
    type="button"
    className={`web-item-option ion-item-option ${color ? 'option-' + color : ''} ${className}`}
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
);

export const IonLabel = ({ children, position, className = '', ...props }) => (
  <label className={`web-label ion-label ${position ? 'label-' + position : ''} ${className}`} {...props}>
    {children}
  </label>
);

export const IonNote = ({ children, slot, color, className = '', ...props }) => (
  <span className={`web-note ion-note ${slot ? 'slot-' + slot : ''} ${color ? 'note-' + color : ''} ${className}`} {...props}>
    {children}
  </span>
);

export const IonBadge = ({ children, color, className = '', slot, ...props }) => (
  <span className={`web-badge ion-badge ${color ? 'badge-' + color : ''} ${slot ? 'slot-' + slot : ''} ${className}`} {...props}>
    {children}
  </span>
);

export const IonChip = ({ children, color, outline, onClick, className = '', ...props }) => (
  <div
    className={`web-chip ion-chip ${color ? 'chip-' + color : ''} ${outline ? 'chip-outline' : ''} ${className}`}
    onClick={onClick}
    role={onClick ? 'button' : undefined}
    {...props}
  >
    {children}
  </div>
);

export const IonAvatar = ({ children, className = '', ...props }) => (
  <div className={`web-avatar ion-avatar ${className}`} {...props}>
    {children}
  </div>
);

export const IonThumbnail = ({ children, slot, className = '', ...props }) => (
  <div className={`web-thumbnail ion-thumbnail ${slot ? 'slot-' + slot : ''} ${className}`} {...props}>
    {children}
  </div>
);

export const IonImg = ({ src, alt = '', className = '', ...props }) => (
  <img src={src} alt={alt} className={`web-img ion-img ${className}`} {...props} />
);

export const IonDatetimeButton = ({ datetime, className = '', ...props }) => (
  <button type="button" className={`web-datetime-button ion-datetime-button ${className}`} {...props}>
    Select Date/Time
  </button>
);

/* =========================================================================
   Inputs & Form Controls
   ========================================================================= */

export const WebInput = React.forwardRef(({
  value = '',
  onIonInput,
  onIonChange,
  onChange,
  type = 'text',
  placeholder,
  disabled,
  required,
  className = '',
  id,
  name,
  min,
  max,
  step,
  autoFocus,
  readonly,
  ...props
}, ref) => {
  const handleChange = (e) => {
    onChange?.(e);
    onIonInput?.({ detail: { value: e.target.value } });
    onIonChange?.({ detail: { value: e.target.value } });
  };

  return (
    <input
      ref={ref}
      id={id}
      name={name}
      type={type}
      value={value ?? ''}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readonly}
      required={required}
      min={min}
      max={max}
      step={step}
      autoFocus={autoFocus}
      onChange={handleChange}
      className={`web-input ion-input ${className}`}
      {...props}
    />
  );
});
export const IonInput = WebInput;

export const WebTextarea = React.forwardRef(({
  value = '',
  onIonInput,
  onIonChange,
  onChange,
  placeholder,
  disabled,
  required,
  rows = 3,
  className = '',
  id,
  name,
  readonly,
  ...props
}, ref) => {
  const handleChange = (e) => {
    onChange?.(e);
    onIonInput?.({ detail: { value: e.target.value } });
    onIonChange?.({ detail: { value: e.target.value } });
  };

  return (
    <textarea
      ref={ref}
      id={id}
      name={name}
      value={value ?? ''}
      placeholder={placeholder}
      disabled={disabled}
      readOnly={readonly}
      required={required}
      rows={rows}
      onChange={handleChange}
      className={`web-textarea ion-textarea ${className}`}
      {...props}
    />
  );
});
export const IonTextarea = WebTextarea;

export const IonSelect = ({
  children,
  value,
  onIonChange,
  onChange,
  placeholder,
  disabled,
  className = '',
  ...props
}) => {
  const handleChange = (e) => {
    onChange?.(e);
    onIonChange?.({ detail: { value: e.target.value } });
  };

  return (
    <select
      value={value ?? ''}
      disabled={disabled}
      onChange={handleChange}
      className={`web-select ion-select ${className}`}
      {...props}
    >
      {placeholder && <option value="" disabled>{placeholder}</option>}
      {children}
    </select>
  );
};

export const IonSelectOption = ({ children, value, ...props }) => (
  <option value={value} {...props}>
    {children}
  </option>
);

export const IonCheckbox = ({
  checked,
  onIonChange,
  onChange,
  disabled,
  className = '',
  ...props
}) => {
  const handleChange = (e) => {
    onChange?.(e);
    onIonChange?.({ detail: { checked: e.target.checked, value: e.target.value } });
  };

  return (
    <input
      type="checkbox"
      checked={!!checked}
      disabled={disabled}
      onChange={handleChange}
      className={`web-checkbox ion-checkbox ${className}`}
      {...props}
    />
  );
};

export const IonToggle = ({
  checked,
  onIonChange,
  onChange,
  disabled,
  className = '',
  children,
  ...props
}) => {
  const handleChange = (e) => {
    onChange?.(e);
    onIonChange?.({ detail: { checked: e.target.checked } });
  };

  return (
    <label className={`web-toggle-wrapper ${className}`}>
      {children}
      <input
        type="checkbox"
        role="switch"
        checked={!!checked}
        disabled={disabled}
        onChange={handleChange}
        className="web-toggle-input"
        {...props}
      />
      <span className="web-toggle-slider" />
    </label>
  );
};

export const IonRadio = ({ value, checked, onIonChange, onChange, disabled, className = '', ...props }) => (
  <input
    type="radio"
    value={value}
    checked={checked}
    disabled={disabled}
    onChange={(e) => {
      onChange?.(e);
      onIonChange?.({ detail: { value: e.target.value } });
    }}
    className={`web-radio ${className}`}
    {...props}
  />
);

export const IonRadioGroup = ({ value, onIonChange, children, className = '', ...props }) => (
  <div className={`web-radio-group ${className}`} {...props}>
    {children}
  </div>
);

export const IonDatetime = ({ value, onIonChange, onChange, presentation = 'date', className = '', ...props }) => (
  <input
    type={presentation === 'time' ? 'time' : presentation === 'date' ? 'date' : 'datetime-local'}
    value={value ? String(value).slice(0, 10) : ''}
    onChange={(e) => {
      onChange?.(e);
      onIonChange?.({ detail: { value: e.target.value } });
    }}
    className={`web-input web-datetime ion-datetime ${className}`}
    {...props}
  />
);

export const IonSearchbar = ({
  value = '',
  onIonInput,
  onIonChange,
  onChange,
  placeholder = 'Search...',
  disabled,
  className = '',
  ...props
}) => {
  const handleChange = (e) => {
    onChange?.(e);
    onIonInput?.({ detail: { value: e.target.value } });
    onIonChange?.({ detail: { value: e.target.value } });
  };

  return (
    <div className={`web-searchbar ion-searchbar ${className}`}>
      <span className="searchbar-icon">🔍</span>
      <input
        type="search"
        value={value ?? ''}
        placeholder={placeholder}
        disabled={disabled}
        onChange={handleChange}
        className="searchbar-input"
        {...props}
      />
    </div>
  );
};

/* =========================================================================
   Feedbacks & Modals
   ========================================================================= */

export const WebSpinner = ({ name = 'crescent', color, className = '', ...props }) => (
  <span
    className={`web-spinner ion-spinner spinner-${name} ${color ? 'spinner-' + color : ''} ${className}`}
    {...props}
  />
);
export const IonSpinner = WebSpinner;

export const IonLoading = ({ isOpen, message = 'Loading...', onDidDismiss }) => {
  if (!isOpen) return null;
  return (
    <div className="web-loading-overlay">
      <div className="web-loading-card">
        <WebSpinner name="crescent" />
        {message && <p className="loading-message">{message}</p>}
      </div>
    </div>
  );
};

export const IonModal = ({ isOpen, onDidDismiss, children, className = '', ...props }) => {
  if (!isOpen) return null;

  return (
    <div
      className={`web-modal-overlay ${className}`}
      onClick={(e) => {
        if (e.target === e.currentTarget) onDidDismiss?.();
      }}
    >
      <div className="web-modal-dialog" {...props}>
        {children}
      </div>
    </div>
  );
};

export const IonAlert = ({
  isOpen,
  header,
  subHeader,
  message,
  buttons = [],
  inputs = [],
  onDidDismiss,
}) => {
  const [inputValues, setInputValues] = useState({});

  if (!isOpen) return null;

  return (
    <div className="web-alert-overlay" onClick={() => onDidDismiss?.()}>
      <div className="web-alert-card" onClick={(e) => e.stopPropagation()}>
        {header && <h3 className="web-alert-title">{header}</h3>}
        {subHeader && <h4 className="web-alert-subtitle">{subHeader}</h4>}
        {message && <p className="web-alert-message">{message}</p>}

        {inputs && inputs.length > 0 && (
          <div className="web-alert-inputs">
            {inputs.map((inp, idx) => (
              <input
                key={idx}
                type={inp.type || 'text'}
                placeholder={inp.placeholder}
                value={inputValues[inp.name] || inp.value || ''}
                onChange={(e) => setInputValues({ ...inputValues, [inp.name]: e.target.value })}
                className="web-input"
              />
            ))}
          </div>
        )}

        <div className="web-alert-buttons">
          {buttons.map((btn, idx) => {
            const text = typeof btn === 'string' ? btn : btn.text;
            const handler = typeof btn === 'object' ? btn.handler : null;
            const role = typeof btn === 'object' ? btn.role : null;
            return (
              <button
                key={idx}
                type="button"
                className={`web-alert-btn ${role === 'cancel' ? 'btn-cancel' : ''}`}
                onClick={() => {
                  const shouldDismiss = handler ? handler(inputValues) !== false : true;
                  if (shouldDismiss) onDidDismiss?.();
                }}
              >
                {text}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export const IonToast = ({
  isOpen,
  message,
  duration = 3000,
  onDidDismiss,
  color,
  buttons,
}) => {
  useEffect(() => {
    if (!isOpen) return;
    if (duration > 0) {
      const timer = setTimeout(() => {
        onDidDismiss?.();
      }, duration);
      return () => clearTimeout(timer);
    }
  }, [isOpen, duration, onDidDismiss]);

  if (!isOpen) return null;

  return (
    <div className={`web-toast ${color ? 'toast-' + color : ''}`}>
      <span className="toast-text">{message}</span>
      {buttons && (
        <div className="toast-buttons">
          {buttons.map((b, i) => (
            <button
              key={i}
              type="button"
              className="toast-action-btn"
              onClick={() => {
                b.handler?.();
                onDidDismiss?.();
              }}
            >
              {b.text}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* =========================================================================
   Refresher & Scrolling
   ========================================================================= */

export const IonRefresher = ({ children, onIonRefresh, className = '', ...props }) => (
  <div className={`web-refresher ion-refresher ${className}`} {...props}>
    {children}
  </div>
);

export const IonRefresherContent = ({ pullingText, refreshingSpinner = 'crescent', ...props }) => null;

export const IonInfiniteScroll = ({ children, onIonInfinite, disabled, className = '', ...props }) => (
  <div className={`web-infinite-scroll ion-infinite-scroll ${className}`} {...props}>
    {children}
  </div>
);

export const IonInfiniteScrollContent = ({ loadingSpinner = 'crescent', loadingText = 'Loading more...', ...props }) => (
  <div className="web-infinite-scroll-content" {...props}>
    <WebSpinner name={loadingSpinner} />
    {loadingText && <span style={{ marginLeft: '8px' }}>{loadingText}</span>}
  </div>
);

export const IonSkeletonText = ({ animated = true, style = {}, className = '', ...props }) => (
  <div
    className={`web-skeleton-text ${animated ? 'skeleton-animated' : ''} ${className}`}
    style={{
      backgroundColor: '#e2e8f0',
      borderRadius: '4px',
      height: '1.2em',
      ...style,
    }}
    {...props}
  />
);

/* =========================================================================
   Segments, Tabs & Menus
   ========================================================================= */

export const IonSegment = ({ value, onIonChange, children, className = '', ...props }) => (
  <div className={`web-segment ion-segment ${className}`} {...props}>
    {React.Children.map(children, (child) => {
      if (!React.isValidElement(child)) return child;
      return React.cloneElement(child, {
        active: child.props.value === value,
        onSelect: () => onIonChange?.({ detail: { value: child.props.value } }),
      });
    })}
  </div>
);

export const IonSegmentButton = ({ children, value, active, onSelect, className = '', ...props }) => (
  <button
    type="button"
    className={`web-segment-button ion-segment-button ${active ? 'segment-button-checked' : ''} ${className}`}
    onClick={onSelect}
    {...props}
  >
    {children}
  </button>
);

export const IonFab = ({ children, vertical = 'bottom', horizontal = 'end', slot, className = '', ...props }) => (
  <div className={`web-fab ion-fab fab-${vertical}-${horizontal} ${slot ? 'slot-' + slot : ''} ${className}`} {...props}>
    {children}
  </div>
);

export const IonFabButton = ({ children, onClick, color, className = '', ...props }) => (
  <button
    type="button"
    className={`web-fab-button ion-fab-button ${color ? 'fab-' + color : ''} ${className}`}
    onClick={onClick}
    {...props}
  >
    {children}
  </button>
);

export const IonMenu = ({ contentId = 'main-content', children, className = '', ...props }) => (
  <aside className={`web-menu ion-menu ${className}`} {...props}>
    {children}
  </aside>
);

export const IonMenuButton = ({ className = '', ...props }) => (
  <button type="button" className={`web-menu-button ion-menu-button ${className}`} {...props}>
    ☰
  </button>
);

export const IonMenuToggle = ({ children, autoHide, ...props }) => (
  <div className="web-menu-toggle ion-menu-toggle" {...props}>
    {children}
  </div>
);

/* =========================================================================
   Hooks
   ========================================================================= */

export const useIonToast = () => {
  const present = (options) => {
    const toast = document.createElement('div');
    toast.className = `web-toast-floating ${options.color ? 'toast-' + options.color : ''}`;
    toast.textContent = typeof options === 'string' ? options : options.message || '';
    document.body.appendChild(toast);
    setTimeout(() => {
      toast.classList.add('toast-exit');
      setTimeout(() => toast.remove(), 300);
    }, options.duration || 3000);
  };

  const dismiss = () => {
    document.querySelectorAll('.web-toast-floating').forEach((el) => el.remove());
  };

  return [present, dismiss];
};

export const useIonAlert = () => {
  const present = (options) => {
    const confirmed = window.confirm((options.header ? options.header + '\n' : '') + (options.message || ''));
    if (options.buttons) {
      const btn = options.buttons.find((b) =>
        typeof b === 'object' && (confirmed ? b.role !== 'cancel' : b.role === 'cancel')
      );
      if (btn && typeof btn === 'object' && btn.handler) {
        btn.handler();
      }
    }
  };

  const dismiss = () => {};
  return [present, dismiss];
};

export const useIonLoading = () => {
  const present = () => {};
  const dismiss = () => {};
  return [present, dismiss];
};

export const useIonViewDidEnter = (callback) => {
  useEffect(() => {
    callback?.();
  }, []);
};

export const useIonViewWillEnter = (callback) => {
  useEffect(() => {
    callback?.();
  }, []);
};

export const useIonViewDidLeave = (callback) => {
  useEffect(() => {
    return () => callback?.();
  }, []);
};

export const useIonViewWillLeave = (callback) => {
  useEffect(() => {
    return () => callback?.();
  }, []);
};

/* =========================================================================
   Framework Utilities
   ========================================================================= */

export const setupIonicReact = () => {
  // Pure Web: no-op, no Ionic runtime required!
};

export const isPlatform = (p) => p === 'desktop' || p === 'web';
export const getPlatforms = () => ['desktop', 'web'];

export const IonProgressBar = ({ value = 0, buffer, color, reversed, type = 'determinate', className = '', style = {}, ...props }) => (
  <div className={`web-progress-bar ion-progress-bar ${color ? 'progress-' + color : ''} ${className}`} style={{ width: '100%', height: '4px', backgroundColor: '#e2e8f0', borderRadius: '2px', overflow: 'hidden', ...style }} {...props}>
    <div style={{ width: `${Math.min(Math.max(value, 0), 1) * 100}%`, height: '100%', backgroundColor: '#3b82f6', transition: 'width 0.3s ease' }} />
  </div>
);

export const IonFabList = ({ children, side = 'top', className = '', ...props }) => (
  <div className={`web-fab-list ion-fab-list side-${side} ${className}`} {...props}>
    {children}
  </div>
);

export const IonActionSheet = ({ isOpen, header, subHeader, buttons = [], onDidDismiss, className = '', ...props }) => {
  if (!isOpen) return null;
  return (
    <div className={`web-action-sheet-overlay ${className}`} onClick={() => onDidDismiss?.()} {...props}>
      <div className="web-action-sheet-card" onClick={(e) => e.stopPropagation()}>
        {header && <h3 className="sheet-title">{header}</h3>}
        {subHeader && <p className="sheet-subtitle">{subHeader}</p>}
        <div className="sheet-buttons">
          {buttons.map((btn, i) => (
            <button key={i} type="button" className={`sheet-btn ${btn.role || ''}`} onClick={() => { btn.handler?.(); onDidDismiss?.(); }}>
              {btn.text}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};

export const IonPopover = ({ isOpen, children, onDidDismiss, className = '', ...props }) => {
  if (!isOpen) return null;
  return (
    <div className={`web-popover-overlay ${className}`} onClick={() => onDidDismiss?.()} {...props}>
      <div className="web-popover-content" onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </div>
  );
};

export const IonBackdrop = ({ visible = true, tappable = true, onIonBackdropTap, ...props }) => (
  visible ? <div className="web-backdrop ion-backdrop" onClick={onIonBackdropTap} {...props} /> : null
);

export const IonRippleEffect = () => null;

export const IonRouterLink = ({ children, href, routerLink, className = '', ...props }) => {
  let history;
  try { history = useHistory(); } catch (e) { history = null; }
  const target = routerLink || href;
  const handleClick = (e) => {
    if (target && history) {
      e.preventDefault();
      history.push(target);
    }
  };
  return <a href={target || '#'} onClick={handleClick} className={`web-router-link ${className}`} {...props}>{children}</a>;
};

export const IonNav = ({ children, root, ...props }) => <div className="web-nav" {...props}>{children}</div>;
export const IonNavLink = ({ children, component, routerDirection, ...props }) => <div className="web-nav-link" {...props}>{children}</div>;

export const IonAccordion = ({ children, value, ...props }) => <details className="web-accordion" {...props}>{children}</details>;
export const IonAccordionGroup = ({ children, ...props }) => <div className="web-accordion-group" {...props}>{children}</div>;

export const IonBreadcrumbs = ({ children, className = '', ...props }) => <nav className={`web-breadcrumbs ${className}`} {...props}>{children}</nav>;
export const IonBreadcrumb = ({ children, href, routerLink, active, className = '', ...props }) => (
  <span className={`web-breadcrumb ${active ? 'breadcrumb-active' : ''} ${className}`} {...props}>{children}</span>
);

export const useIonRouter = () => {
  let history;
  try { history = useHistory(); } catch (e) { history = null; }
  return {
    push: (path) => history?.push(path),
    replace: (path) => history?.replace(path),
    back: () => history?.goBack(),
    forward: () => history?.goForward(),
    canGoBack: () => (history?.length || 0) > 1,
    routeInfo: { pathname: window.location.pathname },
  };
};

export const useIonActionSheet = () => {
  const present = () => {};
  const dismiss = () => {};
  return [present, dismiss];
};

export const useIonModal = (component, componentProps) => {
  const present = () => {};
  const dismiss = () => {};
  return [present, dismiss];
};

export const useIonPopover = (component, componentProps) => {
  const present = () => {};
  const dismiss = () => {};
  return [present, dismiss];
};

