Name:           gnome-shell-appgrid-uninstall
Version:        1.0.0
Release:        1%{?dist}
Summary:        Right-click uninstall option for GNOME App Grid

License:        GPL-2.0-or-later
URL:            https://github.com/i-soumya18/gnome-shell-appgrid-uninstall
Source0:        %{name}-%{version}.tar.gz

BuildArch:      noarch
BuildRequires:  meson
BuildRequires:  ninja-build
BuildRequires:  glib2

Requires:       gnome-shell >= 42
Requires:       gjs
Recommends:     flatpak
Recommends:     snapd

%description
Adds an Uninstall option to the GNOME Shell application grid context menu.
Supports Flatpak, Snap, APT, RPM, and DNF package types.

%prep
%autosetup -n %{name}-%{version}

%build
%meson
%meson_build

%install
%meson_install

%files
%license LICENSE
%doc README.md CHANGELOG.md
%{_datadir}/gnome-shell/extensions/appgrid-uninstall@i-soumya18.github.io/*
%{_datadir}/glib-2.0/schemas/org.gnome.shell.extensions.appgrid-uninstall.gschema.xml
%{_datadir}/polkit-1/actions/org.gnome.AppGridUninstall.policy

%changelog
* Tue Apr 14 2026 Soumya <i.soumya18@example.com> - 1.0.0-1
- Initial RPM packaging for app-grid uninstall extension
