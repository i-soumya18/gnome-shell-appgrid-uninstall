#include "package_ops.h"

gboolean uninstall_package(const gchar *package_type,
                           const gchar *package_name,
                           gchar **error_msg) {
    (void)package_type;
    (void)package_name;

    if (error_msg)
        *error_msg = g_strdup("Native helper uninstall backend not implemented yet");

    return FALSE;
}
