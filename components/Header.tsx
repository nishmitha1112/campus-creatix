import React from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { User } from "../types";
import { auth } from "../firebase";
import { LogOut, User as UserIcon } from "lucide-react";

interface HeaderProps {
  user: User;
}

const Header: React.FC<HeaderProps> = ({ user }) => {
  const navigate = useNavigate();

  const basePath = user?.role === "student" ? "/student" : "/faculty";

  const handleLogout = async () => {
    try {
      await auth.signOut();
      navigate("/login");
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  const navItems = [
    { name: "Home", path: `${basePath}/home` },
    { name: "Feed", path: `${basePath}/feed` },
    { name: "Leaderboard", path: `${basePath}/leaderboard` },
    { name: "Messages", path: `${basePath}/messages` },
  ];

  const getNavLinkClass = (isActive: boolean, isMobile: boolean = false) => {
    const base = isMobile
      ? "px-3 py-2 rounded-md text-sm font-medium whitespace-nowrap block"
      : "px-3 py-2 rounded-md text-sm font-medium transition-colors";

    const activeState =
      "text-[var(--accent-primary)] bg-[var(--accent-secondary)]";

    const inactiveState =
      "text-[var(--text-body)] hover:text-[var(--accent-primary)] hover:bg-[var(--bg-main)]";

    return `${base} ${isActive ? activeState : inactiveState}`;
  };

  return (
    <header className="bg-[var(--bg-card)] border-b border-[var(--border-default)] sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">

          {/* Logo */}
          <div
            className="flex-shrink-0 flex items-center gap-2 cursor-pointer"
            onClick={() => navigate(`${basePath}/home`)}
          >
            <div className="w-8 h-8 bg-[var(--accent-primary)] rounded-md flex items-center justify-center text-white font-bold text-xl">
              C
            </div>
            <span className="font-bold text-xl text-[var(--text-heading)]">
              CampusCreatix
            </span>
          </div>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex space-x-4 items-center">
            {navItems.map((item) => (
              <NavLink
                key={item.name}
                to={item.path}
                className={({ isActive }) => getNavLinkClass(isActive)}
              >
                {item.name}
              </NavLink>
            ))}
          </nav>

          {/* Right Side */}
          <div className="flex items-center gap-4">
            <NavLink to={`${basePath}/profile`}>
              {user?.photoURL ? (
                <img
                  src={user.photoURL}
                  alt="Profile"
                  className="w-8 h-8 rounded-full border object-cover"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-[var(--input-bg)] flex items-center justify-center">
                  <UserIcon size={18} />
                </div>
              )}
            </NavLink>

            <button
              onClick={handleLogout}
              className="p-2 text-[var(--text-muted)] hover:text-red-500"
              title="Logout"
            >
              <LogOut size={20} />
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Navigation */}
      <div className="md:hidden border-t overflow-x-auto">
        <div className="flex px-4 py-2 space-x-4">
          {navItems.map((item) => (
            <NavLink
              key={item.name}
              to={item.path}
              className={({ isActive }) => getNavLinkClass(isActive, true)}
            >
              {item.name}
            </NavLink>
          ))}
        </div>
      </div>
    </header>
  );
};

export default Header;