"use client";

import {
  type Dispatch,
  type SetStateAction,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import PageHeader from "@/components/shared/PageHeader";
import type { SessionBootstrapPayload } from "@/core/session/session-payload";
import { useSessionStore } from "@/core/session/session.store";
import {
  LOCALE_DATE_FORMATS,
  type LocaleCode,
  resolveLocale,
} from "@/core/i18n/locale";
import {
  type UserAccount,
  type UserPreferences,
  createDefaultPreferences,
  normalizeLanguage,
  useUsersStore,
} from "@/core/users/users.store";
import { createPasswordDigest } from "@/core/security/passwords";
import {
  applySessionPayload,
  parseApiResponse,
} from "@/lib/client/session-client";


type Copy = {
  breadcrumb: string;
  pageTitle: string;
  pageSubtitle: string;
  backToSettings: string;
  guestNotice: string;
  guestTitle: string;
  guestMessage: string;
  profileMissing: string;
  userFallback: string;
  profileImageAlt: (name: string) => string;
  roleLabels: {
    admin: string;
    manager: string;
    reader: string;
    user: string;
  };
  memberSince: (value: string) => string;
  noDate: string;
  changeImage: string;
  removePhoto: string;
  personalData: string;
  fullName: string;
  emailProfessional: string;
  phoneContact: string;
  dniLabel: string;
  fullNamePlaceholder: string;
  emailPlaceholder: string;
  phonePlaceholder: string;
  dniPlaceholder: string;
  securityAccount: string;
  password: string;
  lastUpdate: (value: string) => string;
  noChanges: string;
  cancel: string;
  change: string;
  newPassword: string;
  repeatPassword: string;
  hidePassword: string;
  showPassword: string;
  auth2fa: string;
  auth2faDescription: string;
  activeSessions: string;
  activeSessionsDescription: string;
  viewDetails: string;
  unsavedChanges: string;
  lastUpdateAt: (value: string) => string;
  noPendingChanges: string;
  discard: string;
  saveChanges: string;
  preferencesTitle: string;
  languageLabel: string;
  timezoneLabel: string;
  systemNotifications: string;
  systemNotificationsDescription: string;
  emailAlerts: string;
  emailAlertsDescription: string;
  browserNotifications: string;
  browserNotificationsDescription: string;
  errorRequired: string;
  errorEmailTaken: string;
  errorPasswordsMismatch: string;
};

const LANGUAGE_OPTIONS: Array<{ value: LocaleCode; label: string }> = [
  { value: "es", label: "Español (España)" },
  { value: "es-419", label: "Español (Latam)" },
  { value: "gl", label: "Galego" },
  { value: "eu", label: "Euskara" },
  { value: "ca", label: "Català" },
  { value: "va", label: "Valencià" },
  { value: "en", label: "English (US)" },
];

const COPY_ES: Copy = {
  breadcrumb: "Configuración > Perfil",
  pageTitle: "Configuración del perfil",
  pageSubtitle: "Gestiona tu información personal y preferencias de cuenta.",
  backToSettings: "Volver a configuración",
  guestNotice: "Esta sección solo está disponible en cuentas autenticadas.",
  guestTitle: "Perfil no disponible en modo invitado",
  guestMessage: "Inicia sesión para gestionar tu información y preferencias.",
  profileMissing: "No hay un usuario activo para editar.",
  userFallback: "Usuario",
  profileImageAlt: (name) => `Perfil de ${name}`,
  roleLabels: {
    admin: "Administrador",
    manager: "Gestor",
    reader: "Lector",
    user: "Usuario",
  },
  memberSince: (value) => `Miembro desde: ${value}`,
  noDate: "Sin fecha",
  changeImage: "Cambiar imagen",
  removePhoto: "Eliminar foto",
  personalData: "Datos personales",
  fullName: "Nombre completo",
  emailProfessional: "Correo electrónico profesional",
  phoneContact: "Teléfono de contacto",
  dniLabel: "DNI / Identificación",
  fullNamePlaceholder: "Juan Pérez",
  emailPlaceholder: "juan.perez@kora.org",
  phonePlaceholder: "+34 612 345 678",
  dniPlaceholder: "12345678X",
  securityAccount: "Seguridad y cuenta",
  password: "Contraseña",
  lastUpdate: (value) => `Última actualización: ${value}`,
  noChanges: "Sin cambios",
  cancel: "Cancelar",
  change: "Cambiar",
  newPassword: "Nueva contraseña",
  repeatPassword: "Repetir contraseña",
  hidePassword: "Ocultar contraseña",
  showPassword: "Ver contraseña",
  auth2fa: "Autenticación 2FA",
  auth2faDescription: "Activada vía app de autenticación",
  activeSessions: "Sesiones activas",
  activeSessionsDescription: "Conectado en 2 dispositivos",
  viewDetails: "Ver detalles",
  unsavedChanges: "Cambios sin guardar",
  lastUpdateAt: (value) => `Última actualización: ${value}`,
  noPendingChanges: "Sin cambios pendientes",
  discard: "Descartar",
  saveChanges: "Guardar cambios",
  preferencesTitle: "Preferencias",
  languageLabel: "Idioma de la interfaz",
  timezoneLabel: "Zona horaria",
  systemNotifications: "Notificaciones del sistema",
  systemNotificationsDescription: "Avisos generales y cambios importantes.",
  emailAlerts: "Alertas por correo electrónico",
  emailAlertsDescription: "Recibe resúmenes y notificaciones clave.",
  browserNotifications: "Notificaciones en el navegador",
  browserNotificationsDescription: "Avisos en tiempo real desde el navegador.",
  errorRequired: "Completa nombre, apellidos, DNI y correo.",
  errorEmailTaken: "Ya existe un usuario con ese correo.",
  errorPasswordsMismatch: "Las contraseñas no coinciden.",
};

const COPY: Record<LocaleCode, Copy> = {
  es: COPY_ES,
  "es-419": {
    ...COPY_ES,
    roleLabels: { ...COPY_ES.roleLabels },
  },
  gl: {
    breadcrumb: "Configuración > Perfil",
    pageTitle: "Configuración do perfil",
    pageSubtitle:
      "Xestiona a túa información persoal e as preferencias da conta.",
    backToSettings: "Volver á configuración",
    guestNotice: "Esta sección só está dispoñible en contas autenticadas.",
    guestTitle: "Perfil non dispoñible en modo convidado",
    guestMessage: "Inicia sesión para xestionar a túa información e preferencias.",
    profileMissing: "Non hai un usuario activo para editar.",
    userFallback: "Usuario",
    profileImageAlt: (name) => `Perfil de ${name}`,
    roleLabels: {
      admin: "Administrador",
      manager: "Xestor",
      reader: "Lector",
      user: "Usuario",
    },
    memberSince: (value) => `Membro desde: ${value}`,
    noDate: "Sen data",
    changeImage: "Cambiar imaxe",
    removePhoto: "Eliminar foto",
    personalData: "Datos persoais",
    fullName: "Nome completo",
    emailProfessional: "Correo electrónico profesional",
    phoneContact: "Teléfono de contacto",
    dniLabel: "DNI / Identificación",
    fullNamePlaceholder: "Juan Pérez",
    emailPlaceholder: "juan.perez@kora.org",
    phonePlaceholder: "+34 612 345 678",
    dniPlaceholder: "12345678X",
    securityAccount: "Seguridade e conta",
    password: "Contrasinal",
    lastUpdate: (value) => `Última actualización: ${value}`,
    noChanges: "Sen cambios",
    cancel: "Cancelar",
    change: "Cambiar",
    newPassword: "Novo contrasinal",
    repeatPassword: "Repetir contrasinal",
    hidePassword: "Agochar contrasinal",
    showPassword: "Ver contrasinal",
    auth2fa: "Autenticación 2FA",
    auth2faDescription: "Activada vía app de autenticación",
    activeSessions: "Sesións activas",
    activeSessionsDescription: "Conectado en 2 dispositivos",
    viewDetails: "Ver detalles",
    unsavedChanges: "Cambios sen gardar",
    lastUpdateAt: (value) => `Última actualización: ${value}`,
    noPendingChanges: "Sen cambios pendentes",
    discard: "Descartar",
    saveChanges: "Gardar cambios",
    preferencesTitle: "Preferencias",
    languageLabel: "Idioma da interface",
    timezoneLabel: "Fuso horario",
    systemNotifications: "Notificacións do sistema",
    systemNotificationsDescription: "Avisos xerais e cambios importantes.",
    emailAlerts: "Alertas por correo electrónico",
    emailAlertsDescription: "Recibe resumos e notificacións clave.",
    browserNotifications: "Notificacións no navegador",
    browserNotificationsDescription: "Avisos en tempo real desde o navegador.",
    errorRequired: "Completa nome, apelidos, DNI e correo.",
    errorEmailTaken: "Xa existe un usuario con ese correo.",
    errorPasswordsMismatch: "Os contrasinais non coinciden.",
  },
  eu: {
    breadcrumb: "Ezarpenak > Profila",
    pageTitle: "Profilaren ezarpenak",
    pageSubtitle:
      "Kudeatu zure informazio pertsonala eta kontuaren hobespenak.",
    backToSettings: "Itzuli ezarpenetara",
    guestNotice: "Atal hau kontu autentifikatuetan bakarrik dago eskuragarri.",
    guestTitle: "Profila ez dago erabilgarri gonbidatu moduan",
    guestMessage: "Hasi saioa zure informazioa eta hobespenak kudeatzeko.",
    profileMissing: "Ez dago editatzeko erabiltzaile aktiborik.",
    userFallback: "Erabiltzailea",
    profileImageAlt: (name) => `Profilaren irudia: ${name}`,
    roleLabels: {
      admin: "Administratzailea",
      manager: "Kudeatzailea",
      reader: "Irakurlea",
      user: "Erabiltzailea",
    },
    memberSince: (value) => `Kidea noiztik: ${value}`,
    noDate: "Datarik gabe",
    changeImage: "Aldatu irudia",
    removePhoto: "Ezabatu argazkia",
    personalData: "Datu pertsonalak",
    fullName: "Izen osoa",
    emailProfessional: "Posta elektroniko profesionala",
    phoneContact: "Harremanetarako telefonoa",
    dniLabel: "NAN / Identifikazioa",
    fullNamePlaceholder: "Juan Pérez",
    emailPlaceholder: "juan.perez@kora.org",
    phonePlaceholder: "+34 612 345 678",
    dniPlaceholder: "12345678X",
    securityAccount: "Segurtasuna eta kontua",
    password: "Pasahitza",
    lastUpdate: (value) => `Azken eguneraketa: ${value}`,
    noChanges: "Aldaketarik ez",
    cancel: "Ezeztatu",
    change: "Aldatu",
    newPassword: "Pasahitz berria",
    repeatPassword: "Errepikatu pasahitza",
    hidePassword: "Ezkutatu pasahitza",
    showPassword: "Erakutsi pasahitza",
    auth2fa: "2FA autentifikazioa",
    auth2faDescription: "Autentifikazio aplikazioaren bidez aktibatuta",
    activeSessions: "Saio aktiboak",
    activeSessionsDescription: "2 gailutan konektatuta",
    viewDetails: "Ikusi xehetasunak",
    unsavedChanges: "Gorde gabeko aldaketak",
    lastUpdateAt: (value) => `Azken eguneraketa: ${value}`,
    noPendingChanges: "Ez dago aldaketarik zain",
    discard: "Baztertu",
    saveChanges: "Gorde aldaketak",
    preferencesTitle: "Hobespenak",
    languageLabel: "Interfazearen hizkuntza",
    timezoneLabel: "Ordu-eremua",
    systemNotifications: "Sistemaren jakinarazpenak",
    systemNotificationsDescription: "Abisu orokorrak eta aldaketa garrantzitsuak.",
    emailAlerts: "Posta elektroniko bidezko alertak",
    emailAlertsDescription: "Jaso laburpenak eta jakinarazpen nagusiak.",
    browserNotifications: "Nabigatzaileko jakinarazpenak",
    browserNotificationsDescription:
      "Abisuak denbora errealean nabigatzailetik.",
    errorRequired: "Bete izena, abizenak, NANa eta posta elektronikoa.",
    errorEmailTaken: "Dagoeneko badago posta horrekin erabiltzaile bat.",
    errorPasswordsMismatch: "Pasahitzak ez datoz bat.",
  },
  ca: {
    breadcrumb: "Configuració > Perfil",
    pageTitle: "Configuració del perfil",
    pageSubtitle:
      "Gestiona la teva informació personal i les preferències del compte.",
    backToSettings: "Torna a la configuració",
    guestNotice: "Aquesta secció només està disponible en comptes autenticats.",
    guestTitle: "Perfil no disponible en mode convidat",
    guestMessage: "Inicia sessió per gestionar la teva informació i preferències.",
    profileMissing: "No hi ha cap usuari actiu per editar.",
    userFallback: "Usuari",
    profileImageAlt: (name) => `Perfil de ${name}`,
    roleLabels: {
      admin: "Administrador",
      manager: "Gestor",
      reader: "Lector",
      user: "Usuari",
    },
    memberSince: (value) => `Membre des de: ${value}`,
    noDate: "Sense data",
    changeImage: "Canvia la imatge",
    removePhoto: "Elimina la foto",
    personalData: "Dades personals",
    fullName: "Nom complet",
    emailProfessional: "Correu electrònic professional",
    phoneContact: "Telèfon de contacte",
    dniLabel: "DNI / Identificació",
    fullNamePlaceholder: "Juan Pérez",
    emailPlaceholder: "juan.perez@kora.org",
    phonePlaceholder: "+34 612 345 678",
    dniPlaceholder: "12345678X",
    securityAccount: "Seguretat i compte",
    password: "Contrasenya",
    lastUpdate: (value) => `Última actualització: ${value}`,
    noChanges: "Sense canvis",
    cancel: "Cancel·la",
    change: "Canvia",
    newPassword: "Nova contrasenya",
    repeatPassword: "Repeteix la contrasenya",
    hidePassword: "Amaga la contrasenya",
    showPassword: "Mostra la contrasenya",
    auth2fa: "Autenticació 2FA",
    auth2faDescription: "Activada mitjançant una aplicació d'autenticació",
    activeSessions: "Sessions actives",
    activeSessionsDescription: "Connectat a 2 dispositius",
    viewDetails: "Veure detalls",
    unsavedChanges: "Canvis sense desar",
    lastUpdateAt: (value) => `Última actualització: ${value}`,
    noPendingChanges: "Sense canvis pendents",
    discard: "Descarta",
    saveChanges: "Desa els canvis",
    preferencesTitle: "Preferències",
    languageLabel: "Idioma de la interfície",
    timezoneLabel: "Zona horària",
    systemNotifications: "Notificacions del sistema",
    systemNotificationsDescription: "Avisos generals i canvis importants.",
    emailAlerts: "Alertes per correu electrònic",
    emailAlertsDescription: "Rep resums i notificacions clau.",
    browserNotifications: "Notificacions al navegador",
    browserNotificationsDescription: "Avisos en temps real des del navegador.",
    errorRequired: "Completa el nom, els cognoms, el DNI i el correu.",
    errorEmailTaken: "Ja existeix un usuari amb aquest correu.",
    errorPasswordsMismatch: "Les contrasenyes no coincideixen.",
  },
  va: {
    breadcrumb: "Configuració > Perfil",
    pageTitle: "Configuració del perfil",
    pageSubtitle:
      "Gestiona la teua informació personal i les preferències del compte.",
    backToSettings: "Torna a la configuració",
    guestNotice: "Aquesta secció només està disponible en comptes autenticats.",
    guestTitle: "Perfil no disponible en mode convidat",
    guestMessage: "Inicia sessió per gestionar la teua informació i preferències.",
    profileMissing: "No hi ha cap usuari actiu per editar.",
    userFallback: "Usuari",
    profileImageAlt: (name) => `Perfil de ${name}`,
    roleLabels: {
      admin: "Administrador",
      manager: "Gestor",
      reader: "Lector",
      user: "Usuari",
    },
    memberSince: (value) => `Membre des de: ${value}`,
    noDate: "Sense data",
    changeImage: "Canvia la imatge",
    removePhoto: "Elimina la foto",
    personalData: "Dades personals",
    fullName: "Nom complet",
    emailProfessional: "Correu electrònic professional",
    phoneContact: "Telèfon de contacte",
    dniLabel: "DNI / Identificació",
    fullNamePlaceholder: "Juan Pérez",
    emailPlaceholder: "juan.perez@kora.org",
    phonePlaceholder: "+34 612 345 678",
    dniPlaceholder: "12345678X",
    securityAccount: "Seguretat i compte",
    password: "Contrasenya",
    lastUpdate: (value) => `Última actualització: ${value}`,
    noChanges: "Sense canvis",
    cancel: "Cancel·la",
    change: "Canvia",
    newPassword: "Nova contrasenya",
    repeatPassword: "Repeteix la contrasenya",
    hidePassword: "Amaga la contrasenya",
    showPassword: "Mostra la contrasenya",
    auth2fa: "Autenticació 2FA",
    auth2faDescription: "Activada mitjançant una aplicació d'autenticació",
    activeSessions: "Sessions actives",
    activeSessionsDescription: "Connectat a 2 dispositius",
    viewDetails: "Veure detalls",
    unsavedChanges: "Canvis sense guardar",
    lastUpdateAt: (value) => `Última actualització: ${value}`,
    noPendingChanges: "Sense canvis pendents",
    discard: "Descarta",
    saveChanges: "Guarda els canvis",
    preferencesTitle: "Preferències",
    languageLabel: "Idioma de la interfície",
    timezoneLabel: "Zona horària",
    systemNotifications: "Notificacions del sistema",
    systemNotificationsDescription: "Avisos generals i canvis importants.",
    emailAlerts: "Alertes per correu electrònic",
    emailAlertsDescription: "Rep resums i notificacions clau.",
    browserNotifications: "Notificacions al navegador",
    browserNotificationsDescription: "Avisos en temps real des del navegador.",
    errorRequired: "Completa el nom, els cognoms, el DNI i el correu.",
    errorEmailTaken: "Ja existeix un usuari amb aquest correu.",
    errorPasswordsMismatch: "Les contrasenyes no coincideixen.",
  },
  en: {
    breadcrumb: "Settings > Profile",
    pageTitle: "Profile settings",
    pageSubtitle: "Manage your personal information and account preferences.",
    backToSettings: "Back to settings",
    guestNotice: "This section is only available for authenticated accounts.",
    guestTitle: "Profile not available in guest mode",
    guestMessage: "Sign in to manage your information and preferences.",
    profileMissing: "There is no active user to edit.",
    userFallback: "User",
    profileImageAlt: (name) => `Profile of ${name}`,
    roleLabels: {
      admin: "Administrator",
      manager: "Manager",
      reader: "Reader",
      user: "User",
    },
    memberSince: (value) => `Member since: ${value}`,
    noDate: "No date",
    changeImage: "Change image",
    removePhoto: "Remove photo",
    personalData: "Personal details",
    fullName: "Full name",
    emailProfessional: "Work email",
    phoneContact: "Contact phone",
    dniLabel: "ID / Identification",
    fullNamePlaceholder: "Alex Johnson",
    emailPlaceholder: "alex.johnson@kora.org",
    phonePlaceholder: "+1 415 555 0190",
    dniPlaceholder: "A1234567",
    securityAccount: "Security and account",
    password: "Password",
    lastUpdate: (value) => `Last update: ${value}`,
    noChanges: "No changes",
    cancel: "Cancel",
    change: "Change",
    newPassword: "New password",
    repeatPassword: "Repeat password",
    hidePassword: "Hide password",
    showPassword: "Show password",
    auth2fa: "2FA authentication",
    auth2faDescription: "Enabled via authenticator app",
    activeSessions: "Active sessions",
    activeSessionsDescription: "Connected on 2 devices",
    viewDetails: "View details",
    unsavedChanges: "Unsaved changes",
    lastUpdateAt: (value) => `Last update: ${value}`,
    noPendingChanges: "No pending changes",
    discard: "Discard",
    saveChanges: "Save changes",
    preferencesTitle: "Preferences",
    languageLabel: "Interface language",
    timezoneLabel: "Time zone",
    systemNotifications: "System notifications",
    systemNotificationsDescription: "General alerts and important changes.",
    emailAlerts: "Email alerts",
    emailAlertsDescription: "Receive summaries and key notifications.",
    browserNotifications: "Browser notifications",
    browserNotificationsDescription: "Real-time alerts from the browser.",
    errorRequired: "Complete first name, last name, ID, and email.",
    errorEmailTaken: "A user with that email already exists.",
    errorPasswordsMismatch: "Passwords do not match.",
  },
};

type UserProfileFormState = {
  firstName: string;
  lastName: string;
  phone: string;
  photoUrl: string;
  dni: string;
  email: string;
  password: string;
  passwordRepeat: string;
};

function normalize(value: string) {
  return value.trim();
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase())
    .join("");
}

function getUserFormState(user: UserAccount | null): UserProfileFormState {
  return {
    firstName: user?.firstName ?? "",
    lastName: user?.lastName ?? "",
    phone: user?.phone ?? "",
    photoUrl: user?.photoUrl ?? "",
    dni: user?.dni ?? "",
    email: user?.email ?? "",
    password: "",
    passwordRepeat: "",
  };
}

function resolvePreferences(preferences?: UserPreferences): UserPreferences {
  const defaults = createDefaultPreferences();
  return {
    ...defaults,
    ...(preferences ?? {}),
    language: normalizeLanguage(preferences?.language ?? defaults.language),
    notifications: {
      ...defaults.notifications,
      ...(preferences?.notifications ?? {}),
    },
  };
}

function ToggleSwitch({
  checked,
  onChange,
  disabled = false,
}: {
  checked: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <label
      className={`relative inline-flex items-center ${
        disabled ? "cursor-not-allowed opacity-60" : "cursor-pointer"
      }`}
    >
      <input
        type="checkbox"
        className="peer sr-only"
        checked={checked}
        onChange={onChange}
        disabled={disabled}
      />
      <span className="h-6 w-11 rounded-full bg-slate-200 transition peer-checked:bg-primary" />
      <span className="pointer-events-none absolute left-1 top-1 h-4 w-4 rounded-full bg-white transition peer-checked:translate-x-5" />
    </label>
  );
}

function UserProfileCard({
  user,
  users,
  preferences,
  copy,
  dateLocale,
  onPreferencesChange,
  onResetPreferences,
  onSave,
}: {
  user: UserAccount | null;
  users: UserAccount[];
  preferences: UserPreferences;
  copy: Copy;
  dateLocale: string;
  onPreferencesChange: Dispatch<SetStateAction<UserPreferences>>;
  onResetPreferences: () => void;
  onSave: (updates: Partial<UserAccount>) => void | Promise<void>;
}) {
  const [form, setForm] = useState<UserProfileFormState>(
    getUserFormState(user)
  );
  const [formError, setFormError] = useState<string | null>(null);
  const [lastSavedAt, setLastSavedAt] = useState<number | null>(null);
  const photoInputRef = useRef<HTMLInputElement | null>(null);

  const updatePreferences = (
    updater: (prev: UserPreferences) => UserPreferences,
    persist = false
  ) => {
    onPreferencesChange((prev) => {
      const next = updater(prev);
      if (persist && user) {
        onSave({ preferences: resolvePreferences(next) });
      }
      return next;
    });
  };

  const fullName = `${form.firstName} ${form.lastName}`.trim();
  const displayName = fullName || user?.name || copy.userFallback;
  const initials = getInitials(displayName || copy.userFallback);
  const roleLabel =
    user?.role === "Admin"
      ? copy.roleLabels.admin
      : user?.role === "Gestor"
        ? copy.roleLabels.manager
        : user?.role === "Lector"
          ? copy.roleLabels.reader
          : copy.roleLabels.user;
  const memberSinceValue = user?.lastAccessAt
    ? new Date(user.lastAccessAt).toLocaleDateString(dateLocale, {
        month: "long",
        year: "numeric",
      })
    : copy.noDate;
  const memberSinceLabel = copy.memberSince(memberSinceValue);

  const hasChanges = useMemo(() => {
    if (!user) return false;
    const baseline = resolvePreferences(user.preferences);
    const preferencesChanged =
      preferences.language !== baseline.language ||
      preferences.timezone !== baseline.timezone ||
      preferences.notifications.email !== baseline.notifications.email ||
      preferences.notifications.browser !== baseline.notifications.browser ||
      preferences.notifications.updates !== baseline.notifications.updates ||
      preferences.twoFactorEnabled !== baseline.twoFactorEnabled;
    return (
      preferencesChanged ||
      normalize(form.firstName) !== normalize(user.firstName ?? "") ||
      normalize(form.lastName) !== normalize(user.lastName ?? "") ||
      normalize(form.phone) !== normalize(user.phone ?? "") ||
      normalize(form.photoUrl) !== normalize(user.photoUrl ?? "") ||
      normalize(form.dni) !== normalize(user.dni ?? "") ||
      normalizeEmail(form.email) !== normalizeEmail(user.email ?? "") ||
      normalize(form.password) !== "" ||
      normalize(form.passwordRepeat) !== ""
    );
  }, [form, user, preferences]);

  const hasPassword =
    normalize(form.password).length > 0 ||
    normalize(form.passwordRepeat).length > 0;
  const passwordsMatch = form.password === form.passwordRepeat;
  const canSave =
    hasChanges &&
    normalize(form.firstName).length > 0 &&
    normalize(form.lastName).length > 0 &&
    normalize(form.dni).length > 0 &&
    normalizeEmail(form.email).length > 0 &&
    (!hasPassword || passwordsMatch);

  const handleSave = async () => {
    if (!user) return;
    setFormError(null);
    const firstName = normalize(form.firstName);
    const lastName = normalize(form.lastName);
    const phone = normalize(form.phone);
    const photoUrl = normalize(form.photoUrl);
    const dni = normalize(form.dni).toUpperCase();
    const email = normalizeEmail(form.email);
    const password = form.password;

    if (!firstName || !lastName || !dni || !email) {
      setFormError(copy.errorRequired);
      return;
    }

    const emailTaken = users.some(
      (candidate) =>
        candidate.id !== user.id &&
        candidate.email.toLowerCase() === email.toLowerCase()
    );
    if (emailTaken) {
      setFormError(copy.errorEmailTaken);
      return;
    }

    if (hasPassword && !passwordsMatch) {
      setFormError(copy.errorPasswordsMismatch);
      return;
    }

    const updates: Partial<UserAccount> = {
      firstName,
      lastName,
      phone,
      photoUrl,
      dni,
      email,
      name: `${firstName} ${lastName}`.trim(),
      preferences: resolvePreferences(preferences),
    };

    if (hasPassword) {
      try {
        const passwordDigest = await createPasswordDigest(password);
        updates.passwordDigest = passwordDigest;
      } catch (error) {
        console.error(error);
        setFormError(
          "No se pudo proteger la contraseña. Actualiza el navegador e inténtalo de nuevo."
        );
        return;
      }
    }

      try {
        await onSave(updates);
        setLastSavedAt(Date.now());
        setForm((prev) => ({
          ...prev,
          firstName,
          lastName,
          phone,
          photoUrl,
          dni,
          email,
          password: "",
          passwordRepeat: "",
        }));
      } catch (error) {
        console.error(error);
        setFormError(
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el perfil."
        );
      }
  };

  const handleReset = () => {
    setForm(getUserFormState(user));
    setFormError(null);
    onResetPreferences();
  };

  const handlePhotoChange = (file?: File | null) => {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result;
      if (typeof result === "string") {
        setForm((prev) => ({ ...prev, photoUrl: result }));
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFullNameChange = (value: string) => {
    const parts = value.trim().split(" ").filter(Boolean);
    const nextFirstName = parts.shift() ?? "";
    const nextLastName = parts.join(" ");
    setForm((prev) => ({
      ...prev,
      firstName: nextFirstName,
      lastName: nextLastName,
    }));
  };

  const statusLabel = hasChanges
    ? copy.unsavedChanges
    : lastSavedAt
      ? copy.lastUpdateAt(new Date(lastSavedAt).toLocaleString(dateLocale))
      : copy.noPendingChanges;

  if (!user) {
    return (
      <section className="rounded-3xl border border-dashed border-gray-200 bg-white p-6 text-sm text-gray-500">
        {copy.profileMissing}
      </section>
    );
  }

  return (
    <section className="space-y-6">
      <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex items-center gap-5">
            <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full border border-gray-200 bg-slate-100 text-2xl font-semibold text-slate-700">
              {form.photoUrl ? (
                <img
                  src={form.photoUrl}
                  alt={copy.profileImageAlt(displayName)}
                  className="h-full w-full object-cover"
                />
              ) : (
                <span>{initials || "U"}</span>
              )}
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{displayName}</h2>
              <p className="text-sm text-primary">{roleLabel}</p>
              <p className="text-xs text-gray-400">{memberSinceLabel}</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="cursor-pointer rounded-xl border border-gray-200 bg-white px-4 py-2 text-xs font-semibold text-gray-600 shadow-sm hover:bg-gray-50">
              {copy.changeImage}
              <input
                ref={photoInputRef}
                type="file"
                accept="image/png,image/jpeg,image/svg+xml"
                className="sr-only"
                onChange={(event) => handlePhotoChange(event.target.files?.[0])}
              />
            </label>
            {form.photoUrl ? (
              <button
                type="button"
                onClick={() => {
                  setForm((prev) => ({ ...prev, photoUrl: "" }));
                  if (photoInputRef.current) {
                    photoInputRef.current.value = "";
                  }
                }}
                className="rounded-xl border border-rose-200 bg-white px-4 py-2 text-xs font-semibold text-rose-500 shadow-sm hover:bg-rose-50"
              >
                {copy.removePhoto}
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {formError ? (
        <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {formError}
        </div>
      ) : null}

      <div className="grid grid-cols-1 gap-6">
        <div className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
              <span className="material-symbols-outlined text-[16px]">
                person
              </span>
            </span>
            {copy.personalData}
          </div>
          <div className="mt-5 space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500">
                {copy.fullName}
              </label>
              <input
                value={fullName}
                onChange={(event) => handleFullNameChange(event.target.value)}
                placeholder={copy.fullNamePlaceholder}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">
                {copy.emailProfessional}
              </label>
              <input
                type="email"
                value={form.email}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, email: event.target.value }))
                }
                placeholder={copy.emailPlaceholder}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">
                {copy.phoneContact}
              </label>
              <input
                value={form.phone}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, phone: event.target.value }))
                }
                placeholder={copy.phonePlaceholder}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">
                {copy.dniLabel}
              </label>
              <input
                value={form.dni}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, dni: event.target.value }))
                }
                placeholder={copy.dniPlaceholder}
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm outline-none focus:border-primary focus:ring-4 focus:ring-primary/10"
              />
            </div>
          </div>
        </div>
      </div>

      <section className="rounded-3xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="flex items-center gap-2 text-base font-semibold text-gray-900">
          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-50 text-blue-600">
            <span className="material-symbols-outlined text-[16px]">settings</span>
          </span>
          {copy.preferencesTitle}
        </div>
        <div className="mt-5 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <div className="space-y-4">
            <div>
              <label className="text-xs font-semibold text-gray-500">
                {copy.languageLabel}
              </label>
              <select
                value={preferences.language}
                onChange={(event) =>
                  updatePreferences(
                    (prev) => ({
                      ...prev,
                      language: event.target.value,
                    }),
                    true
                  )
                }
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
              >
                {LANGUAGE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs font-semibold text-gray-500">
                {copy.timezoneLabel}
              </label>
              <select
                value={preferences.timezone}
                onChange={(event) =>
                  updatePreferences(
                    (prev) => ({
                      ...prev,
                      timezone: event.target.value,
                    }),
                    true
                  )
                }
                className="mt-2 w-full rounded-2xl border border-gray-200 bg-white px-4 py-3 text-sm text-gray-700 shadow-sm"
              >
                <option>(GMT+01:00) Madrid</option>
                <option>(GMT+00:00) Lisboa</option>
                <option>(GMT-03:00) Buenos Aires</option>
              </select>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {copy.systemNotifications}
                </p>
                <p className="text-xs text-gray-400">
                  {copy.systemNotificationsDescription}
                </p>
              </div>
              <ToggleSwitch
                checked={preferences.notifications.updates}
                onChange={() =>
                  updatePreferences(
                    (prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        updates: !prev.notifications.updates,
                      },
                    }),
                    true
                  )
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {copy.emailAlerts}
                </p>
                <p className="text-xs text-gray-400">
                  {copy.emailAlertsDescription}
                </p>
              </div>
              <ToggleSwitch
                checked={preferences.notifications.email}
                onChange={() =>
                  updatePreferences(
                    (prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        email: !prev.notifications.email,
                      },
                    }),
                    true
                  )
                }
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-gray-200 bg-white px-4 py-3">
              <div>
                <p className="text-sm font-semibold text-gray-800">
                  {copy.browserNotifications}
                </p>
                <p className="text-xs text-gray-400">
                  {copy.browserNotificationsDescription}
                </p>
              </div>
              <ToggleSwitch
                checked={preferences.notifications.browser}
                onChange={() =>
                  updatePreferences(
                    (prev) => ({
                      ...prev,
                      notifications: {
                        ...prev.notifications,
                        browser: !prev.notifications.browser,
                      },
                    }),
                    true
                  )
                }
              />
            </div>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 pt-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs text-gray-400">{statusLabel}</p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasChanges}
            className={`rounded-2xl border border-gray-200 bg-white px-4 py-2 text-sm font-semibold shadow-sm transition ${
              hasChanges
                ? "text-gray-600 hover:bg-gray-50"
                : "cursor-not-allowed text-gray-300 opacity-60"
            }`}
          >
            {copy.discard}
          </button>
          <button
            id="profile-user-save"
            type="button"
            onClick={handleSave}
            disabled={!canSave}
            className={`rounded-2xl px-5 py-2 text-sm font-semibold text-white shadow transition ${
              canSave
                ? "bg-primary hover:bg-primary/90"
                : "cursor-not-allowed bg-primary/50"
            }`}
          >
            {copy.saveChanges}
          </button>
        </div>
      </div>
    </section>
  );
}

function ProfileSettingsWorkspace({
  activeUser,
  users,
}: {
  activeUser: UserAccount | null;
  users: UserAccount[];
}) {
  const [preferences, setPreferences] = useState<UserPreferences>(() =>
    resolvePreferences(activeUser?.preferences)
  );
  const locale = resolveLocale(preferences.language);
  const copy = COPY[locale];
  const dateLocale = LOCALE_DATE_FORMATS[locale];

  return (
    <UserProfileCard
      user={activeUser}
      users={users}
      preferences={preferences}
      copy={copy}
      dateLocale={dateLocale}
      onPreferencesChange={setPreferences}
      onResetPreferences={() =>
        setPreferences(resolvePreferences(activeUser?.preferences))
      }
      onSave={async (updates) => {
        if (!activeUser) return;

        const response = await fetch("/api/account/profile", {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            firstName: updates.firstName,
            lastName: updates.lastName,
            phone: updates.phone,
            photoUrl: updates.photoUrl,
            dni: updates.dni,
            email: updates.email,
            passwordDigest: updates.passwordDigest,
            preferences: updates.preferences,
          }),
        });

        const session = await parseApiResponse<SessionBootstrapPayload>(response);
        applySessionPayload(session);
      }}
    />
  );
}

export default function ProfileSettingsPage() {
  const hydrated = useSessionStore((s) => s.hydrated);
  const mode = useSessionStore((s) => s.mode);
  const admin = useSessionStore((s) => s.admin);
  const companyCode = useSessionStore((s) => s.companyCode);
  const activeUserId = useSessionStore((s) => s.activeUserId);
  const users = useUsersStore((s) => s.users);
  const ensureSeed = useUsersStore((s) => s.ensureSeed);
  const activeUser = users.find((user) => user.id === activeUserId) ?? null;
  const fallbackCopy =
    COPY[resolveLocale(resolvePreferences(activeUser?.preferences).language)];


  useEffect(() => {
    if (!hydrated || mode !== "authenticated") return;
    ensureSeed(companyCode, admin);
  }, [hydrated, mode, companyCode, admin, ensureSeed]);

  if (!hydrated) {
    return <div className="min-h-screen bg-background-light" aria-busy="true" />;
  }

  if (mode === "guest") {
    return (
      <div className="space-y-8">
        <PageHeader
          title={"Configuraci\u00f3n del perfil"}
          subtitle={
            "Esta secci\u00f3n solo est\u00e1 disponible en cuentas autenticadas."
          }
          backHref="/settings"
          backLabel={"Volver a configuraci\u00f3n"}
        />

        <div className="rounded-3xl border border-gray-200 bg-white p-8 text-center shadow-sm">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gray-100 text-gray-500">
            <span className="material-symbols-outlined text-[24px]">info</span>
          </div>
          <h2 className="mt-4 text-lg font-semibold text-gray-900">
            {fallbackCopy.guestTitle}
          </h2>
          <p className="mt-2 text-sm text-gray-500">
            {fallbackCopy.guestMessage}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title={"Configuraci\u00f3n del perfil"}
        subtitle={
          "Gestiona tu informaci\u00f3n personal y preferencias de cuenta."
        }
        backHref="/settings"
        backLabel={"Volver a configuraci\u00f3n"}
      />

      <ProfileSettingsWorkspace
        key={activeUser?.id ?? "profile-workspace"}
        activeUser={activeUser}
        users={users}
      />
    </div>
  );
}




