"use client";
import React, { useContext } from "react";
import { getAuth, User } from "firebase/auth";
import { getApp } from "firebase/app";
import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import { AuthContext } from "@/contexts/AuthContext";

const ProfileMenu = () => {
  const { setShowLoginPopup } = useContext(AuthContext);
  const [currentUser, setCurrentUser] = useState<User | null | "loading">(
    "loading"
  );
  const [isOpen, setIsOpen] = useState(false);
  const [imageError, setImageError] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Lazy init auth on client
    const auth = getAuth(getApp());
    const unsub = auth.onAuthStateChanged((user) => {
      setCurrentUser(user);
    });

    return () => {
      unsub();
    };
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (currentUser === "loading") {
    return (
      <div className="z-50 overflow-hidden mx-4 relative flex items-center justify-center animate-spin w-10 h-10 bg-gray-100 border border-gray-500 dark:border-transparent rounded-full dark:bg-gray-600">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          fill="none"
          viewBox="0 0 24 24"
          strokeWidth={1.5}
          stroke="currentColor"
          className="w-6 h-6"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182m0-4.991v4.99"
          />
        </svg>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <button
        aria-label="Login Button"
        onClick={() => {
          setShowLoginPopup(true);
        }}
        className="overflow-hidden mx-4 relative w-10 h-10 bg-gray-100 border border-gray-500 dark:border-transparent rounded-full dark:bg-gray-600 cursor-pointer"
      >
        <svg
          className="absolute top-0 -left-1 w-12 h-12 text-gray-400"
          fill="currentColor"
          viewBox="0 0 20 20"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            fillRule="evenodd"
            d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z"
            clipRule="evenodd"
          ></path>
        </svg>
      </button>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        className="flex items-center gap-1.5 btn btn-ghost rounded-full px-2"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className="avatar">
          <div className="w-10 h-10 rounded-full relative overflow-hidden bg-primary">
            {currentUser?.photoURL && !imageError ? (
              <Image
                src={currentUser.photoURL}
                alt={currentUser?.displayName || "User"}
                fill
                className="object-cover"
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-primary-content font-bold text-lg">
                {currentUser?.displayName?.charAt(0) || currentUser?.email?.charAt(0) || "?"}
              </div>
            )}
          </div>
        </div>
        <svg
          className="w-3.5 h-3.5 opacity-70"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>
      {isOpen && (
        <ul className="absolute top-full right-0 z-[100] menu p-2 shadow-lg bg-base-300 rounded-box w-52 mt-2">
          <li>
            <Link href="/profile" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
              <svg className="w-5 h-5 text-current" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"></path>
              </svg>
              Profile
            </Link>
          </li>
          <li>
            <Link href="/projects/my" className="flex items-center gap-2" onClick={() => setIsOpen(false)}>
              <span>📂</span>
              My Projects
            </Link>
          </li>
          <li>
            <button
              onClick={() => {
                const auth = getAuth(getApp());
                auth.signOut();
                setIsOpen(false);
              }}
              className="flex items-center gap-2"
            >
              <svg
                className="w-5 h-5 text-current"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                ></path>
              </svg>
              Logout
            </button>
          </li>
        </ul>
      )}
    </div>
  );
};

export default ProfileMenu;
