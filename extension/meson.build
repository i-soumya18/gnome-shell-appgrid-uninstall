extension_uuid = 'appgrid-uninstall@i-soumya18.github.io'
extensiondir = join_paths(
  get_option('datadir'),
  'gnome-shell',
  'extensions',
  extension_uuid
)

extension_sources = [
  'extension.js',
  'appGridMenu.js',
  'packageDetector.js',
  'uninstallManager.js',
  'confirmDialog.js',
  'notificationHandler.js',
  'systemAppGuard.js',
  'prefs.js',
  'metadata.json',
]

install_data(extension_sources, install_dir: extensiondir)

schema_file = 'schemas/org.gnome.shell.extensions.appgrid-uninstall.gschema.xml'
schema_dir = join_paths(meson.current_source_dir(), 'schemas')
glib_compile_schemas = find_program('glib-compile-schemas')

custom_target(
  'compile-extension-schemas',
  input: schema_file,
  output: 'gschemas.compiled',
  command: [
    glib_compile_schemas,
    '--strict',
    '--targetdir',
    meson.current_build_dir(),
    schema_dir,
  ],
  build_by_default: true
)

install_data(
  schema_file,
  install_dir: join_paths(get_option('datadir'), 'glib-2.0', 'schemas')
)
