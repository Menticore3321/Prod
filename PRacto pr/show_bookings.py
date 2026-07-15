import sqlite3
import os

DIRECTORY = os.path.dirname(os.path.abspath(__file__))
# Database is created in the same folder as the server code files
DB_PATH = os.path.join(DIRECTORY, 'bookings.db')

def show_bookings():
    if not os.path.exists(DB_PATH):
        print(f"Error: Database file not found yet. Submit a booking first to initialize it.")
        return

    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT id, name, email, format, vision, timestamp FROM bookings ORDER BY id ASC")
        rows = cursor.fetchall()
        conn.close()

        if not rows:
            print("The database is currently empty. No bookings have been recorded yet!")
            return

        print("\n" + "="*80)
        print(f"{'ID':<4} | {'CLIENT NAME':<20} | {'EMAIL ADDRESS':<25} | {'FORMAT':<12} | {'DATE RECORDED (UTC)'}")
        print("="*80)
        for row in rows:
            bid, name, email, proj_format, vision, timestamp = row
            # Limit name and email to fit cleanly in columns
            disp_name = name[:18] + '..' if len(name) > 20 else name
            disp_email = email[:23] + '..' if len(email) > 25 else email
            print(f"{bid:<4} | {disp_name:<20} | {disp_email:<25} | {proj_format:<12} | {timestamp}")
            print(f"  - Vision Brief: {vision}")
            print("-"*80)
        print(f"Total Bookings: {len(rows)}\n")

    except Exception as e:
        print(f"Failed to query database: {e}")

if __name__ == "__main__":
    show_bookings()
