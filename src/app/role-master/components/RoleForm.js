"use client";

import { useState, useEffect, forwardRef, useImperativeHandle, useRef } from "react";
import {
  Box,
  MenuItem,
  Alert,
  Typography,
  Checkbox,
  FormControlLabel,
  Divider,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
} from "@mui/material";
import AddIcon from "@mui/icons-material/Add";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import Input from "@/components/common/Input";
import Select from "@/components/common/Select";

const RoleForm = forwardRef(function RoleForm({
  defaultValues = {},
  onSubmit,
  loading,
  serverError = null,
  onClearServerError = () => {},
  viewMode = false, // If true, all inputs are disabled
  onCancel = null, // Optional cancel handler for modal
  modules = [], // List of all available modules
  roleModules = [], // Existing role-module links for this role
}, ref) {
  const base = {
    name: "",
    description: "",
    status: "active",
  };

  const [formData, setFormData] = useState({
    ...base,
    ...(defaultValues || {}),
  });
  const formRef = useRef(null);

  // Table of module permissions
  const [modulePermissionsList, setModulePermissionsList] = useState([]);
  const [selectedModuleId, setSelectedModuleId] = useState("");
  const [selectedPermissions, setSelectedPermissions] = useState({
    can_create: false,
    can_read: false,
    can_update: false,
    can_delete: false,
  });
  const [editingIndex, setEditingIndex] = useState(null); // Track which item is being edited
  const [submitting, setSubmitting] = useState(false);

  // Initialize module permissions list from existing roleModules (only show child modules, not parents)
  useEffect(() => {
    // Wait for both modules and roleModules to be available
    if (!modules || modules.length === 0) {
      // If modules aren't loaded yet, don't process
      return;
    }
    
    // If no roleModules provided, clear the list
    if (!roleModules || roleModules.length === 0) {
      setModulePermissionsList([]);
      return;
    }
    
    // Filter to only show child modules (those with parent_id)
    // We must use the modules array since API response doesn't include parent_id
    const childRoleModules = roleModules.filter((rm) => {
      // Get module_id from various possible locations
      const moduleId = rm.module_id || rm.module?.id;
      if (!moduleId) {
        return false;
      }
      
      // Find the module in the modules array
      const module = modules.find((m) => {
        const mId = typeof m.id === 'string' ? parseInt(m.id) : m.id;
        const rmId = typeof moduleId === 'string' ? parseInt(moduleId) : moduleId;
        return mId === rmId;
      });
      
      if (!module) {
        return false;
      }
      
      // Only include if it's a child module (has parent_id)
      return module.parent_id !== null && module.parent_id !== undefined;
    });
    
    // Map to the format expected by the table
    const list = childRoleModules.map((rm) => {
      const moduleId = rm.module_id || rm.module?.id;
      const moduleIdNum = typeof moduleId === 'string' ? parseInt(moduleId) : moduleId;
      
      const module = modules.find((m) => {
        const mId = typeof m.id === 'string' ? parseInt(m.id) : m.id;
        return mId === moduleIdNum;
      });
      
      return {
        module_id: moduleIdNum,
        module_name: module?.name || rm.module?.name || `Module ${moduleIdNum}`,
        can_create: rm.can_create === true || rm.can_create === 1,
        can_read: rm.can_read === true || rm.can_read === 1,
        can_update: rm.can_update === true || rm.can_update === 1,
        can_delete: rm.can_delete === true || rm.can_delete === 1,
        role_module_id: rm.id, // Keep track of existing ID for updates
      };
    });
    
    setModulePermissionsList(list);
    
    // Clear editing state when roleModules change
    setEditingIndex(null);
    setSelectedModuleId("");
    setSelectedPermissions({
      can_create: false,
      can_read: false,
      can_update: false,
      can_delete: false,
    });
  }, [roleModules, modules]);

  useEffect(() => {
    if (
      defaultValues &&
      (defaultValues.id || Object.keys(defaultValues).length)
    ) {
      setFormData({ ...base, ...defaultValues });
    } else {
      setFormData(base);
    }
  }, [defaultValues?.id]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    if (serverError) onClearServerError();
    setFormData((s) => ({ ...s, [name]: value }));
  };

  // Get available modules (only child modules - those with parent_id, not already in the list, or the currently selected one for editing)
  const getAvailableModules = () => {
    const usedModuleIds = new Set(modulePermissionsList.map((item, index) => 
      editingIndex !== null && index === editingIndex ? null : item.module_id
    ).filter(Boolean));
    // Only show child modules (modules with parent_id)
    const childModules = modules.filter((module) => module.parent_id !== null && module.parent_id !== undefined);
    
    // If a module is selected, include it in available modules (for editing)
    if (selectedModuleId) {
      return childModules.filter((module) => {
        const moduleIdNum = typeof module.id === "string" ? parseInt(module.id, 10) : module.id;
        const selectedIdNum = parseInt(selectedModuleId, 10);
        return !usedModuleIds.has(moduleIdNum) || moduleIdNum === selectedIdNum;
      });
    }
    return childModules.filter((module) => {
      const moduleIdNum = typeof module.id === "string" ? parseInt(module.id, 10) : module.id;
      return !usedModuleIds.has(moduleIdNum);
    });
  };

  const handleAddModule = () => {
    if (!selectedModuleId) return;
    
    const selectedIdNum = parseInt(selectedModuleId, 10);
    const module = modules.find((m) => {
      const moduleIdNum = typeof m.id === "string" ? parseInt(m.id, 10) : m.id;
      return moduleIdNum === selectedIdNum;
    });
    if (!module) return;

    const moduleIdNum = selectedIdNum;
    
    const newItem = {
      module_id: moduleIdNum,
      module_name: module.name,
      can_create: selectedPermissions.can_create,
      can_read: selectedPermissions.can_read,
      can_update: selectedPermissions.can_update,
      can_delete: selectedPermissions.can_delete,
      // Preserve role_module_id if updating
      role_module_id: editingIndex !== null ? modulePermissionsList[editingIndex].role_module_id : undefined,
    };

    let updatedList;
    if (editingIndex !== null) {
      // Update existing item at the editing index
      updatedList = [...modulePermissionsList];
      updatedList[editingIndex] = newItem;
      setEditingIndex(null); // Clear editing state
    } else {
      // Check if module already exists (shouldn't happen, but safety check)
      const existingIndex = modulePermissionsList.findIndex((item) => item.module_id === moduleIdNum);
      if (existingIndex >= 0) {
        updatedList = [...modulePermissionsList];
        updatedList[existingIndex] = newItem;
      } else {
        // Add new item
        updatedList = [...modulePermissionsList, newItem];
      }
    }

    // Note: Parent modules are automatically added in handleSubmit, not in the display list
    setModulePermissionsList(updatedList);
    setSelectedModuleId("");
    setSelectedPermissions({
      can_create: false,
      can_read: false,
      can_update: false,
      can_delete: false,
    });
  };

  const handleDeleteModule = (index) => {
    // Simply remove the module from the list
    // Parent modules will be handled automatically in handleSubmit
    const newList = modulePermissionsList.filter((_, i) => i !== index);
    setModulePermissionsList(newList);
  };

  const handleEditModule = (index) => {
    const item = modulePermissionsList[index];
    
    // Don't remove the item - keep it in the list and track that we're editing it
    setEditingIndex(index);
    
    // Populate the selector and checkboxes with existing values
    setSelectedModuleId(String(item.module_id));
    setSelectedPermissions({
      can_create: item.can_create,
      can_read: item.can_read,
      can_update: item.can_update,
      can_delete: item.can_delete,
    });
  };

  const handleCancelEdit = () => {
    // Cancel editing - clear the form and restore original state
    setEditingIndex(null);
    setSelectedModuleId("");
    setSelectedPermissions({
      can_create: false,
      can_read: false,
      can_update: false,
      can_delete: false,
    });
  };


  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submitting || viewMode) return;
    
    // Clear editing state before submission
    setEditingIndex(null);
    setSelectedModuleId("");
    setSelectedPermissions({
      can_create: false,
      can_read: false,
      can_update: false,
      can_delete: false,
    });
    
    // Convert list to object format for submission
    const modulePermissions = {};
    const parentPermissionsMap = {}; // Track parent permissions (union of all children)
    
    // Add child modules from the list
    modulePermissionsList.forEach((item) => {
      modulePermissions[item.module_id] = {
        can_create: item.can_create,
        can_read: item.can_read,
        can_update: item.can_update,
        can_delete: item.can_delete,
        role_module_id: item.role_module_id || null, // For updates (null if new)
      };
      
      // Track parent permissions (union of all children's permissions)
      const module = modules.find((m) => {
        const moduleIdNum = typeof m.id === "string" ? parseInt(m.id, 10) : m.id;
        return moduleIdNum === item.module_id;
      });
      if (module && module.parent_id) {
        const parentId = module.parent_id;
        if (!parentPermissionsMap[parentId]) {
          // Check if parent already exists in roleModules (for updates)
          const existingParentRoleModule = roleModules.find((rm) => {
            const roleModuleIdNum = typeof rm.module_id === "string" ? parseInt(rm.module_id, 10) : rm.module_id;
            const parentIdNum = typeof parentId === "string" ? parseInt(parentId, 10) : parentId;
            return roleModuleIdNum === parentIdNum;
          });
          parentPermissionsMap[parentId] = {
            can_create: item.can_create,
            can_read: item.can_read,
            can_update: item.can_update,
            can_delete: item.can_delete,
            role_module_id: existingParentRoleModule?.id || null,
          };
        } else {
          // Union permissions (if any child has permission, parent should have it)
          parentPermissionsMap[parentId] = {
            can_create: parentPermissionsMap[parentId].can_create || item.can_create,
            can_read: parentPermissionsMap[parentId].can_read || item.can_read,
            can_update: parentPermissionsMap[parentId].can_update || item.can_update,
            can_delete: parentPermissionsMap[parentId].can_delete || item.can_delete,
            role_module_id: parentPermissionsMap[parentId].role_module_id, // Keep existing ID
          };
        }
      }
    });
    
    // Add parent modules to permissions
    Object.keys(parentPermissionsMap).forEach((parentId) => {
      modulePermissions[parseInt(parentId)] = parentPermissionsMap[parentId];
    });
    
    try {
      setSubmitting(true);
      await onSubmit({
        ...formData,
        modulePermissions,
      });
    } finally {
      setSubmitting(false);
    }
  };

  useImperativeHandle(ref, () => ({
    requestSubmit: () => {
      if (formRef.current) {
        formRef.current.requestSubmit();
      }
    }
  }));

  if (loading) return <p>Loading...</p>;

  const availableModules = getAvailableModules();

  return (
    <>
      {serverError ? <Alert severity="error" sx={{ mb: 2 }}>{serverError}</Alert> : null}
      
      <Box
        component="form"
        ref={formRef}
        onSubmit={handleSubmit}
        sx={{ display: "flex", flexDirection: "column", height: "100%" }}
      >
        <Box sx={{ display: "grid", gap: 2, flex: 1, overflowY: "auto", pr: 1, pt: 2 }}>
          <Input 
            name="name" 
            label="Name" 
            value={formData.name || ""} 
            onChange={handleChange} 
            required={!viewMode}
            disabled={viewMode}
            fullWidth
          />
          <Input 
            name="description" 
            label="Description" 
            value={formData.description || ""} 
            onChange={handleChange}
            disabled={viewMode}
            multiline
            rows={3}
            fullWidth
          />

          <Select
            name="status"
            label="Status"
            value={formData.status || "active"}
            onChange={handleChange}
            disabled={viewMode}
          >
            <MenuItem value="active">Active</MenuItem>
            <MenuItem value="inactive">Inactive</MenuItem>
          </Select>

          <Divider sx={{ my: 2 }} />

          <Typography variant="h6" sx={{ mb: 1 }}>
            Module Permissions
          </Typography>

          {!viewMode && (
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: "flex", gap: 2, alignItems: "center", flexWrap: "wrap" }}>
                <Select
                  label="Select Module"
                  value={selectedModuleId}
                  onChange={(e) => {
                    setSelectedModuleId(e.target.value);
                    // Reset permissions when module changes (unless we're editing and it's the same module)
                    if (editingIndex === null || e.target.value !== String(modulePermissionsList[editingIndex]?.module_id)) {
                      setSelectedPermissions({
                        can_create: false,
                        can_read: false,
                        can_update: false,
                        can_delete: false,
                      });
                      // If module changed while editing, cancel the edit
                      if (editingIndex !== null) {
                        setEditingIndex(null);
                      }
                    }
                  }}
                  sx={{ minWidth: 200, flex: 1 }}
                >
                  <MenuItem value="">Select a module</MenuItem>
                  {availableModules.map((module) => (
                    <MenuItem key={module.id} value={module.id}>
                      {module.name}
                    </MenuItem>
                  ))}
                </Select>
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedPermissions.can_create}
                      onChange={(e) =>
                        setSelectedPermissions((prev) => ({
                          ...prev,
                          can_create: e.target.checked,
                        }))
                      }
                      disabled={!selectedModuleId || submitting}
                    />
                  }
                  label="Create"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedPermissions.can_read}
                      onChange={(e) =>
                        setSelectedPermissions((prev) => ({
                          ...prev,
                          can_read: e.target.checked,
                        }))
                      }
                      disabled={!selectedModuleId || submitting}
                    />
                  }
                  label="Read"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedPermissions.can_update}
                      onChange={(e) =>
                        setSelectedPermissions((prev) => ({
                          ...prev,
                          can_update: e.target.checked,
                        }))
                      }
                      disabled={!selectedModuleId || submitting}
                    />
                  }
                  label="Update"
                />
                <FormControlLabel
                  control={
                    <Checkbox
                      checked={selectedPermissions.can_delete}
                      onChange={(e) =>
                        setSelectedPermissions((prev) => ({
                          ...prev,
                          can_delete: e.target.checked,
                        }))
                      }
                      disabled={!selectedModuleId || submitting}
                    />
                  }
                  label="Delete"
                />
                <Button
                  variant="contained"
                  startIcon={<AddIcon />}
                  onClick={handleAddModule}
                  disabled={!selectedModuleId || submitting}
                  sx={{ minWidth: 100 }}
                >
                  {editingIndex !== null ? "Update" : "Add"}
                </Button>
                {editingIndex !== null && (
                  <Button
                    variant="outlined"
                    onClick={handleCancelEdit}
                    disabled={submitting}
                    sx={{ minWidth: 100 }}
                  >
                    Cancel
                  </Button>
                )}
              </Box>
            </Box>
          )}

          <TableContainer component={Paper} variant="outlined">
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Module</TableCell>
                  <TableCell align="center">Create</TableCell>
                  <TableCell align="center">Read</TableCell>
                  <TableCell align="center">Update</TableCell>
                  <TableCell align="center">Delete</TableCell>
                  {!viewMode && <TableCell align="center" width="120">Actions</TableCell>}
                </TableRow>
              </TableHead>
              <TableBody>
                {modulePermissionsList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={viewMode ? 5 : 6} align="center">
                      <Typography variant="body2" color="text.secondary">
                        No modules added
                      </Typography>
                    </TableCell>
                  </TableRow>
                ) : (
                  modulePermissionsList.map((item, index) => (
                    <TableRow key={item.module_id}>
                      <TableCell>{item.module_name}</TableCell>
                      <TableCell align="center">
                        {item.can_create ? "Yes" : "No"}
                      </TableCell>
                      <TableCell align="center">
                        {item.can_read ? "Yes" : "No"}
                      </TableCell>
                      <TableCell align="center">
                        {item.can_update ? "Yes" : "No"}
                      </TableCell>
                      <TableCell align="center">
                        {item.can_delete ? "Yes" : "No"}
                      </TableCell>
                      {!viewMode && (
                        <TableCell align="center">
                          <IconButton
                            size="small"
                            onClick={() => handleEditModule(index)}
                            color="primary"
                            disabled={submitting}
                          >
                            <EditIcon />
                          </IconButton>
                          <IconButton
                            size="small"
                            onClick={() => handleDeleteModule(index)}
                            color="error"
                            disabled={submitting}
                          >
                            <DeleteIcon />
                          </IconButton>
                        </TableCell>
                      )}
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </TableContainer>
        </Box>
      </Box>
    </>
  );
});

export default RoleForm;
