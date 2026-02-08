"use client";

import {
  AppBar,
  Toolbar,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Box,
  Paper,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Popper,
  ClickAwayListener,
  Portal,
} from "@mui/material";
import MenuIcon from "@mui/icons-material/Menu";
import { useAuth } from "@/hooks/useAuth";
import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { getIcon } from "@/utils/iconMapper";
import SearchInput from "@/components/common/SearchInput";

export default function Navbar({ onMenuClick }) {
  const { logout, user } = useAuth();
  const router = useRouter();
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [dropdownPosition, setDropdownPosition] = useState({ top: 0, right: 0 });
  const searchInputRef = useRef(null);
  const searchPopperRef = useRef(null);

  const openMenu = (e) => setAnchorEl(e.currentTarget);
  const closeMenu = () => setAnchorEl(null);

  const onLogout = async () => {
    closeMenu();
    await logout();
  };

  const goProfile = () => {
    closeMenu();
    router.push("/user-profile");
  };

  // Flatten all menu items for search
  const flattenMenuItems = (items, parents = []) => {
    let result = [];
    items.forEach((item) => {
      const fullPath = [...parents, item.name].join(" > ");
      result.push({
        ...item,
        fullPath,
        parents: [...parents],
      });
      if (item.submodules?.length) {
        result = result.concat(flattenMenuItems(item.submodules, [...parents, item.name]));
      }
    });
    return result;
  };

  // Search menu items
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setSearchOpen(false);
      return;
    }

    const modules = user?.modules || [];
    const allItems = flattenMenuItems(modules);
    const query = searchQuery.toLowerCase().trim();

    const filtered = allItems.filter((item) => {
      const nameMatch = item.name?.toLowerCase().includes(query);
      const pathMatch = item.fullPath?.toLowerCase().includes(query);
      const routeMatch = item.route?.toLowerCase().includes(query);
      return nameMatch || pathMatch || routeMatch;
    });

    setSearchResults(filtered.slice(0, 10)); // Limit to 10 results
    setSearchOpen(filtered.length > 0);
  }, [searchQuery, user?.modules]);

  const handleSearchSelect = (item) => {
    if (item.route) {
      router.push(item.route);
      setSearchQuery("");
      setSearchOpen(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchQuery(e.target.value);
    // Keep search open when typing if there are results
    if (e.target.value.trim()) {
      setSearchOpen(true);
    }
  };

  // Update dropdown position when search opens or window changes
  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      const updatePosition = () => {
        const rect = searchInputRef.current.getBoundingClientRect();
        setDropdownPosition({
          top: rect.bottom + 4,
          right: window.innerWidth - rect.right,
        });
      };

      updatePosition();
      window.addEventListener("scroll", updatePosition, true);
      window.addEventListener("resize", updatePosition);

      return () => {
        window.removeEventListener("scroll", updatePosition, true);
        window.removeEventListener("resize", updatePosition);
      };
    }
  }, [searchOpen, searchQuery]);

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        background: "rgba(232, 239, 254, 0.85)",
        backdropFilter: "blur(8px)",
        borderBottom: "1px solid #e5e7eb",
        color: "#111827",
        zIndex: 1300, // Above sidebar (1200)
      }}
    >
      <Toolbar sx={{ minHeight: "40px !important", height: "40px", px: 1, py: 0 }}>
        {/* Left Menu Icon */}
        <IconButton
          color="inherit"
          edge="start"
          onClick={onMenuClick}
          size="small"
          sx={{
            mr: 1,
            borderRadius: 0.5,
            padding: "4px",
            "&:hover": { backgroundColor: "rgba(0,0,0,0.04)" },
          }}
        >
          <MenuIcon sx={{ fontSize: "20px" }} />
        </IconButton>

        {/* App Name */}
        <Typography
          variant="h6"
          sx={{
            flexGrow: 1,
            fontWeight: 600,
            fontSize: "0.875rem",
            color: "#111827",
            lineHeight: 1.2,
          }}
        >
          Solar Management System
        </Typography>

        {/* Right Side: Search Bar and Profile */}
        <Box sx={{ display: "flex", alignItems: "center", gap: 0.75 }}>
          {/* Search Bar */}
          <Box 
            sx={{ 
              maxWidth: { xs: "160px", sm: "260px", md: "320px" }, 
              position: "relative",
              zIndex: 1400, // Higher than AppBar to ensure search is always accessible
            }}
          >
            <SearchInput
              inputRef={searchInputRef}
              placeholder="Search menus..."
              value={searchQuery}
              onChange={handleSearchChange}
              onFocus={() => {
                if (searchResults.length > 0) {
                  setSearchOpen(true);
                }
              }}
              maxWidth="100%"
              sx={{
                position: "relative",
                zIndex: 1401, // Ensure input is always clickable
              }}
            />

            {/* Search Results Dropdown - Using Portal to ensure it's above everything */}
            {searchOpen && searchResults.length > 0 && (
              <Portal>
                <ClickAwayListener 
                  onClickAway={(e) => {
                    // Don't close if clicking on the search input
                    if (searchInputRef.current && searchInputRef.current.contains(e.target)) {
                      return;
                    }
                    setSearchOpen(false);
                  }}
                >
                  <Paper
                    ref={searchPopperRef}
                    sx={{
                      position: "fixed",
                      top: `${dropdownPosition.top}px`,
                      right: `${dropdownPosition.right}px`,
                      width: { xs: "280px", sm: "380px", md: "450px" },
                      maxHeight: "350px",
                      overflowY: "auto",
                      zIndex: 1500, // Highest z-index to appear above everything
                      boxShadow: "0 4px 20px rgba(0,0,0,0.15)",
                      borderRadius: 1,
                      border: "1px solid #e5e7eb",
                    }}
                  >
                    <List dense sx={{ py: 0.25 }}>
                      {searchResults.map((item, index) => {
                        const IconComponent = getIcon(item.icon);
                        return (
                          <ListItem key={`${item.id}-${index}`} disablePadding>
                            <ListItemButton
                              onClick={() => handleSearchSelect(item)}
                              sx={{
                                py: 0.75,
                                px: 1.5,
                                "&:hover": {
                                  backgroundColor: "rgba(99, 102, 241, 0.08)",
                                },
                              }}
                            >
                              <ListItemIcon sx={{ minWidth: 32 }}>
                                <IconComponent fontSize="small" sx={{ color: "#6366f1", fontSize: "18px" }} />
                              </ListItemIcon>
                              <ListItemText
                                primary={item.name}
                                secondary={item.fullPath !== item.name ? item.fullPath : item.route}
                                primaryTypographyProps={{
                                  fontSize: "0.8125rem",
                                  fontWeight: 500,
                                }}
                                secondaryTypographyProps={{
                                  fontSize: "0.75rem",
                                  color: "text.secondary",
                                }}
                              />
                            </ListItemButton>
                          </ListItem>
                        );
                      })}
                    </List>
                  </Paper>
                </ClickAwayListener>
              </Portal>
            )}
          </Box>

          {/* User Avatar */}
          {user && (
            <Box>
              <IconButton onClick={openMenu} size="small" sx={{ padding: "2px" }}>
                <Avatar
                  sx={{
                    width: 24,
                    height: 24,
                    bgcolor: "#6366f1",
                    color: "white",
                    border: "1px solid white",
                    fontSize: "11px",
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "0.2s",
                    "&:hover": {
                      opacity: 0.9,
                    },
                  }}
                >
                  {(user.name || user.email || "U")[0].toUpperCase()}
                </Avatar>
              </IconButton>

              {/* Dropdown Menu */}
              <Menu
                anchorEl={anchorEl}
                open={Boolean(anchorEl)}
                onClose={closeMenu}
                anchorOrigin={{
                  vertical: "bottom",
                  horizontal: "right",
                }}
                transformOrigin={{
                  vertical: "top",
                  horizontal: "right",
                }}
                slotProps={{
                  paper: {
                    sx: {
                      mt: 0.5,
                      borderRadius: 0.5,
                      minWidth: 140,
                      boxShadow: "0 2px 12px rgba(0,0,0,0.1)",
                      zIndex: 1350, // Below search dropdown (1500) but above AppBar (1300)
                    },
                  },
                }}
              >
              <MenuItem onClick={goProfile} sx={{ fontSize: "0.875rem", py: 0.75 }}>Profile</MenuItem>
              <MenuItem onClick={onLogout} sx={{ fontSize: "0.875rem", py: 0.75 }}>Logout</MenuItem>
              </Menu>
            </Box>
          )}
        </Box>
      </Toolbar>
    </AppBar>
  );
}
