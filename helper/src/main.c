// main.c — D-Bus activated system service for package operations
// This service is auto-started by D-Bus when the extension calls it.
// It uses Polkit to authorize each operation before executing.

#include <gio/gio.h>
#include <polkit/polkit.h>

#include "package_ops.h"

#define BUS_NAME "org.gnome.AppGridUninstall"
#define OBJECT_PATH "/org/gnome/AppGridUninstall"

static void on_bus_acquired(GDBusConnection *conn, const gchar *name, gpointer data);

int main(int argc, char **argv) {
    g_autoptr(GMainLoop) loop = NULL;
    guint owner_id;

    loop = g_main_loop_new(NULL, FALSE);

    owner_id = g_bus_own_name(
        G_BUS_TYPE_SYSTEM,
        BUS_NAME,
        G_BUS_NAME_OWNER_FLAGS_NONE,
        on_bus_acquired,
        NULL,
        NULL,
        NULL,
        NULL);

    g_main_loop_run(loop);
    g_bus_unown_name(owner_id);
    return 0;
}

static void on_bus_acquired(GDBusConnection *conn, const gchar *name, gpointer data) {
    (void)conn;
    (void)name;
    (void)data;
    g_message("AppGridUninstall helper bus acquired");
}
