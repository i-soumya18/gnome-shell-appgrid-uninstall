#ifndef PACKAGE_OPS_H
#define PACKAGE_OPS_H

#include <gio/gio.h>

gboolean uninstall_package(const gchar *package_type,
                           const gchar *package_name,
                           gchar **error_msg);

#endif
