import { NextResponse } from "next/server";
import { auth } from "@/lib/firebase";
import { signInWithEmailAndPassword } from "firebase/auth";

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();
    
    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return NextResponse.json({ uid: userCredential.user.uid, email: userCredential.user.email });
  } catch (err: any) {
    console.error("Login error:", err);
    return NextResponse.json(
      { error: err.message || "Login failed" },
      { status: 400 }
    );
  }
}

