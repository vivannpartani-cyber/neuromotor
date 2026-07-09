import sys
import subprocess
import logging

logger = logging.getLogger(__name__)

def lock_screen():
    """
    Executes the appropriate screen lock command based on the operating system.
    """
    logger.critical("🚨 ANOMALY DETECTED: Triggering immediate OS lock. 🚨")
    
    if sys.platform == "darwin":
        # macOS
        try:
            # Using pmset to put display to sleep (which locks if security settings require password on wake)
            # Alternative: /System/Library/CoreServices/Menu\ Extras/User.menu/Contents/Resources/CGSession -suspend
            subprocess.run(["pmset", "displaysleepnow"], check=True)
            logger.info("macOS screen locked successfully.")
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to lock macOS screen: {e}")
            
    elif sys.platform == "win32":
        # Windows
        import ctypes
        try:
            ctypes.windll.user32.LockWorkStation()
            logger.info("Windows screen locked successfully.")
        except Exception as e:
            logger.error(f"Failed to lock Windows screen: {e}")
            
    elif sys.platform.startswith("linux"):
        # Linux (attempting common desktop environments)
        try:
            # Try GNOME/Unity
            subprocess.run(["dbus-send", "--type=method_call", "--dest=org.gnome.ScreenSaver", "/org/gnome/ScreenSaver", "org.gnome.ScreenSaver.Lock"], check=True)
        except (subprocess.CalledProcessError, FileNotFoundError):
            try:
                # Try loginctl (systemd)
                subprocess.run(["loginctl", "lock-session"], check=True)
            except (subprocess.CalledProcessError, FileNotFoundError):
                logger.error("Failed to lock Linux screen. Desktop environment might not be supported.")
    else:
        logger.error(f"Unsupported operating system for locking: {sys.platform}")
