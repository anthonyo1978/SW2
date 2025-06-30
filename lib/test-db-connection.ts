import { supabase } from "./supabase"

export async function testDatabaseConnection() {
  try {
    // Test basic connection
    const { data, error } = await supabase.from("organizations").select("count").limit(1)

    if (error) {
      console.error("Database connection error:", error)
      return { success: false, error: error.message }
    }

    console.log("✅ Database connection successful")
    return { success: true, data }
  } catch (err) {
    console.error("Database connection failed:", err)
    return { success: false, error: "Connection failed" }
  }
}

export async function testMultiTenancyFunctions() {
  try {
    // Test the critical get_user_org_simple function exists
    const { data, error } = await supabase.rpc("get_user_org_simple")

    if (error && !error.message.includes("JWT")) {
      // JWT error is expected when not authenticated - function exists
      console.error("Multi-tenancy function error:", error)
      return { success: false, error: error.message }
    }

    console.log("✅ Multi-tenancy functions are set up correctly")
    return { success: true }
  } catch (err) {
    console.error("Multi-tenancy test failed:", err)
    return { success: false, error: "Function test failed" }
  }
}
