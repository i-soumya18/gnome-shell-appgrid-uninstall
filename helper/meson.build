helper_policy = 'data/org.gnome.AppGridUninstall.policy'
install_data(
  helper_policy,
  install_dir: join_paths(get_option('datadir'), 'polkit-1', 'actions')
)

if get_option('install_helper_service_metadata')
  helper_service = 'data/org.gnome.AppGridUninstall.service'
  install_data(
    helper_service,
    install_dir: join_paths(get_option('datadir'), 'dbus-1', 'system-services')
  )

  helper_introspection = 'data/org.gnome.AppGridUninstall.xml'
  install_data(
    helper_introspection,
    install_dir: join_paths(get_option('datadir'), 'dbus-1', 'interfaces')
  )
endif
