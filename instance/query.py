import sqlite3

# Connect to your SQLite database
conn = sqlite3.connect('your_database.db')
cursor = conn.cursor()

# Update all users with role_id = 2 to role_id = 1
cursor.execute("""
    UPDATE user
    SET role_id = 1
    WHERE role_id = 2
""")

# Commit changes and close the connection
conn.commit()
conn.close()

print("All users with role_id 2 have been updated to role_id 1.")
