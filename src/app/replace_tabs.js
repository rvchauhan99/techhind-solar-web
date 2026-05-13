const fs = require('fs');

const path = '/Users/ravatrajsinhchauhan/Documents/Programs/techHind/techhind-solar-web/src/app/company-profile/page.js';
let content = fs.readFileSync(path, 'utf8');

// 1. Fix activeTab state
content = content.replace(
    /const \[activeTab, setActiveTab\] = useState\(0\);/,
    'const [activeTab, setActiveTab] = useState("0");'
);

// 2. Replace Tabs component
content = content.replace(
    /<Tabs\s+value={activeTab}\s+onChange={\(e, v\) => \{[\s\S]*?sx=\{\{ mb: 0 \}\}\s*>\s*<Tab label="Bank Details" \/>\s*<Tab label="Branch Details" \/>\s*<Tab label="Images" \/>\s*<Tab label="Warehouse" \/>\s*<\/Tabs>\s*\{activeTab === 0 && \(\s*<>/m,
    `<Tabs
                                value={activeTab}
                                onValueChange={(v) => {
                                    setActiveTab(v);
                                    if (v === "1" && !branchesLoaded) loadBranches();
                                    else if (v === "3" && !warehousesLoaded) loadWarehouses();
                                }}
                                className="w-full"
                            >
                                <div className="border-b border-gray-200 px-4">
                                    <TabsList className="h-12 bg-transparent">
                                        <TabsTrigger value="0" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full bg-transparent px-4">Bank Details</TabsTrigger>
                                        <TabsTrigger value="1" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full bg-transparent px-4">Branch Details</TabsTrigger>
                                        <TabsTrigger value="2" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full bg-transparent px-4">Images</TabsTrigger>
                                        <TabsTrigger value="3" className="data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:text-primary rounded-none h-full bg-transparent px-4">Warehouse</TabsTrigger>
                                    </TabsList>
                                </div>
                                <div className="p-5">
                                    <TabsContent value="0" className="m-0 focus-visible:outline-none">`
);

// 3. Tab 1 header part replacement
content = content.replace(
    /<\/TableContainer>\s*<\/Box>\s*<\/>\s*\)\}\s*\{activeTab === 1 && \(\s*<>/,
    `</table>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="1" className="m-0 focus-visible:outline-none">`
);

// 4. Tab 2 header part replacement
content = content.replace(
    /<\/TableContainer>\s*<\/Box>\s*<\/>\s*\)\}\s*\{activeTab === 2 && \(/,
    `</table>
                                        </div>
                                    </TabsContent>
                                    <TabsContent value="2" className="m-0 focus-visible:outline-none">`
);

// 5. Tab 3 header part replacement
content = content.replace(
    /<\/Box>\s*\)\}\s*\{activeTab === 3 && \(\s*<>/,
    `</div>
                                    </TabsContent>
                                    <TabsContent value="3" className="m-0 focus-visible:outline-none">`
);

// 6. Tabs closing tags
content = content.replace(
    /<\/TableContainer>\s*<\/Box>\s*<\/>\s*\)\}\s*<\/CardContent>\s*<\/Card>\s*<\/Grid>\s*<\/Grid>/,
    `</table>
                                        </div>
                                    </TabsContent>
                                </div>
                            </Tabs>
                        </div>
                    </div>
                </div>`
);

// 7. Replace Bank Table Body and Header block inside Tab 0
content = content.replace(
                                    /<Box display="flex" justifyContent="flex-end" mb=\{2\}>\s*(?:<Button[\s\S]*?>[\s\S]*?\s*\+\s*New Bank Details\s*<\/Button>)\s*<\/Box>\s*<Box sx=\{\{ width: '100%', overflowX: 'auto' \}\}>\s*<TableContainer\s*component=\{Paper\}\s*variant="outlined"\s*>\s*<Table sx=\{\{ minWidth: 800 \}\}>\s*<TableHead>[\s\S]*?<\/TableHead>\s*<TableBody>([\s\S]*?)<\/TableBody>\s*<\/Table>/,
    `<div className="flex justify-end mb-4">
                                            <Button size="sm" onClick={handleNewBankAccount}>
                                                + New Bank Details
                                            </Button>
                                        </div>
                                        <div className="rounded-md border border-gray-200 overflow-hidden overflow-x-auto w-full">
                                            <table className="w-full text-sm text-left whitespace-nowrap">
                                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-medium">
                                                    <tr>
                                                        <th className="px-4 py-3">Bank Name</th>
                                                        <th className="px-4 py-3">Account Name</th>
                                                        <th className="px-4 py-3">Account No</th>
                                                        <th className="px-4 py-3">IFSC</th>
                                                        <th className="px-4 py-3">Branch</th>
                                                        <th className="px-4 py-3">Active</th>
                                                        <th className="px-4 py-3">Default</th>
                                                        <th className="px-4 py-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {bankAccounts.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={8} className="px-4 py-8 text-center text-gray-500">
                                                                No bank accounts found
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        bankAccounts.map((account) => (
                                                            <tr key={account.id} className="hover:bg-gray-50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-gray-900">{account.bank_name}</td>
                                                                <td className="px-4 py-3">{account.bank_account_name}</td>
                                                                <td className="px-4 py-3">{account.bank_account_number}</td>
                                                                <td className="px-4 py-3">{account.bank_account_ifsc || "-"}</td>
                                                                <td className="px-4 py-3">{account.bank_account_branch || "-"}</td>
                                                                <td className="px-4 py-3">
                                                                    <Badge variant={account.is_active ? "success" : "secondary"} className="font-normal border-0 text-xs shadow-none">
                                                                        {account.is_active ? "Active" : "Inactive"}
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {account.is_default ? (
                                                                        <Badge variant="primary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 font-normal border-0 text-xs shadow-none">
                                                                            Default
                                                                        </Badge>
                                                                    ) : "-"}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button size="xs" variant="outline" onClick={() => handleEditBankAccount(account)}>Edit</Button>
                                                                        <Button size="xs" variant="destructive-outline" onClick={() => handleDeleteBankAccount(account.id)} disabled={account.is_default === true}>Delete</Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>`
);

// 8. Replace Branch Table Body and Header block inside Tab 1
content = content.replace(
                                    /<Box display="flex" justifyContent="flex-end" mb=\{2\}>\s*(?:<Button[\s\S]*?>[\s\S]*?\s*\+\s*New Branch\s*<\/Button>)\s*<\/Box>\s*<Box sx=\{\{ width: '100%', overflowX: 'auto' \}\}>\s*<TableContainer\s*component=\{Paper\}\s*variant="outlined"\s*>\s*<Table sx=\{\{ minWidth: 800 \}\}>\s*<TableHead>[\s\S]*?<\/TableHead>\s*<TableBody>([\s\S]*?)<\/TableBody>\s*<\/Table>/,
    `<div className="flex justify-end mb-4">
                                            <Button size="sm" onClick={handleNewBranch}>
                                                + New Branch
                                            </Button>
                                        </div>
                                        <div className="rounded-md border border-gray-200 overflow-hidden overflow-x-auto w-full">
                                            <table className="w-full text-sm text-left whitespace-nowrap">
                                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-medium">
                                                    <tr>
                                                        <th className="px-4 py-3">Name</th>
                                                        <th className="px-4 py-3">Address</th>
                                                        <th className="px-4 py-3">Email</th>
                                                        <th className="px-4 py-3">Contact No</th>
                                                        <th className="px-4 py-3">GST Number</th>
                                                        <th className="px-4 py-3">Quotation Template</th>
                                                        <th className="px-4 py-3">Active</th>
                                                        <th className="px-4 py-3">Default</th>
                                                        <th className="px-4 py-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {branches.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                                                                No branches found
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        branches.map((branch) => (
                                                            <tr key={branch.id} className="hover:bg-gray-50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-gray-900">{branch.name}</td>
                                                                <td className="px-4 py-3 max-w-xs truncate">{branch.address}</td>
                                                                <td className="px-4 py-3">{branch.email}</td>
                                                                <td className="px-4 py-3">{branch.contact_no}</td>
                                                                <td className="px-4 py-3">{branch.gst_number}</td>
                                                                <td className="px-4 py-3 text-gray-500">
                                                                    {branch.quotation_template?.name ?? branch.quotation_template_id ?? "—"}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <Badge variant={branch.is_active ? "success" : "secondary"} className="font-normal border-0 text-xs shadow-none">
                                                                        {branch.is_active ? "Active" : "Inactive"}
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    {branch.is_default && (
                                                                        <Badge variant="primary" className="bg-blue-100 text-blue-800 hover:bg-blue-100 font-normal border-0 text-xs shadow-none">
                                                                            Default
                                                                        </Badge>
                                                                    )}
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button size="xs" variant="outline" onClick={() => handleEditBranch(branch)}>Edit</Button>
                                                                        <Button size="xs" variant="destructive-outline" onClick={() => handleDeleteBranch(branch.id)}>Delete</Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>`
);

// 9. Replace Warehouse Table Body and Header block inside Tab 3
content = content.replace(
                                    /<Box display="flex" justifyContent="flex-end" mb=\{2\}>\s*(?:<Button[\s\S]*?>[\s\S]*?\s*\+\s*New Warehouse\s*<\/Button>)\s*<\/Box>\s*<Box sx=\{\{ width: '100%', overflowX: 'auto' \}\}>\s*<TableContainer\s*component=\{Paper\}\s*variant="outlined"\s*>\s*<Table sx=\{\{ minWidth: 800 \}\}>\s*<TableHead>[\s\S]*?<\/TableHead>\s*<TableBody>([\s\S]*?)<\/TableBody>\s*<\/Table>/,
    `<div className="flex justify-end mb-4">
                                            <Button size="sm" onClick={handleNewWarehouse}>
                                                + New Warehouse
                                            </Button>
                                        </div>
                                        <div className="rounded-md border border-gray-200 overflow-hidden overflow-x-auto w-full">
                                            <table className="w-full text-sm text-left whitespace-nowrap">
                                                <thead className="bg-gray-50 border-b border-gray-200 text-gray-700 font-medium">
                                                    <tr>
                                                        <th className="px-4 py-3">Name</th>
                                                        <th className="px-4 py-3">Contact Person</th>
                                                        <th className="px-4 py-3">Mobile</th>
                                                        <th className="px-4 py-3">State</th>
                                                        <th className="px-4 py-3">Email</th>
                                                        <th className="px-4 py-3">Phone No</th>
                                                        <th className="px-4 py-3">Address</th>
                                                        <th className="px-4 py-3">Managers</th>
                                                        <th className="px-4 py-3">Active</th>
                                                        <th className="px-4 py-3 text-right">Actions</th>
                                                    </tr>
                                                </thead>
                                                <tbody className="divide-y divide-gray-200">
                                                    {warehouses.length === 0 ? (
                                                        <tr>
                                                            <td colSpan={10} className="px-4 py-8 text-center text-gray-500">
                                                                No warehouses found
                                                            </td>
                                                        </tr>
                                                    ) : (
                                                        warehouses.map((warehouse) => (
                                                            <tr key={warehouse.id} className="hover:bg-gray-50 transition-colors">
                                                                <td className="px-4 py-3 font-medium text-gray-900">{warehouse.name}</td>
                                                                <td className="px-4 py-3">{warehouse.contact_person || "-"}</td>
                                                                <td className="px-4 py-3">{warehouse.mobile}</td>
                                                                <td className="px-4 py-3">{warehouse.state_name || "-"}</td>
                                                                <td className="px-4 py-3">{warehouse.email || "-"}</td>
                                                                <td className="px-4 py-3">{warehouse.phone_no || "-"}</td>
                                                                <td className="px-4 py-3 max-w-xs truncate">{warehouse.address}</td>
                                                                <td className="px-4 py-3 text-gray-500 text-xs">
                                                                    {warehouse.managers?.length
                                                                        ? \`\${warehouse.managers.length} manager\${warehouse.managers.length !== 1 ? "s" : ""}\`
                                                                        : "-"}
                                                                </td>
                                                                <td className="px-4 py-3">
                                                                    <Badge variant={warehouse.is_active ? "success" : "secondary"} className="font-normal border-0 text-xs shadow-none">
                                                                        {warehouse.is_active ? "Active" : "Inactive"}
                                                                    </Badge>
                                                                </td>
                                                                <td className="px-4 py-3 text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <Button size="xs" variant="outline" onClick={() => handleOpenManagersDialog(warehouse)}>Managers</Button>
                                                                        <Button size="xs" variant="outline" onClick={() => handleEditWarehouse(warehouse)}>Edit</Button>
                                                                        <Button size="xs" variant="destructive-outline" onClick={() => handleDeleteWarehouse(warehouse.id)}>Delete</Button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        ))
                                                    )}
                                                </tbody>`
);

// 10. Fix Box spacing in Tab 2 (Images)
content = content.replace(
    /<Box sx=\{\{ display: "flex", flexDirection: "column", gap: 4 \}\}>/g,
    '<div className="flex flex-col gap-8">'
);
content = content.replace(
    /<\/Box>\s*\)\}\s*\{activeTab === 3 && \(\s*<>/,
    `</div>\n                                    </TabsContent>\n                                    <TabsContent value="3" className="m-0 focus-visible:outline-none">`
); // already handled in 5, just verifying Box replacement internally

// Simple Box replacements for Tab 2
content = content.replace(/<Box>\s*<Typography variant="h6" sx=\{\{ mb: 2 \}\}>/g, '<div>\n                                        <h3 className="text-lg font-semibold mb-4 text-gray-900">');
content = content.replace(/<\/Typography>\s*<Box sx=\{\{ display: "flex", alignItems: "center", gap: 2 \}\}>/g, '</h3>\n                                        <div className="flex flex-wrap items-center gap-4">');
content = content.replace(/<Typography variant="caption" color="error">/g, '<p className="text-xs text-red-500 mt-2">');
content = content.replace(/<\/Typography>\s*<\/Box>\s*<\/Box>/g, '</p>\n                                        </div>\n                                    </div>');
content = content.replace(/<\/Box>\s*<\/Box>/g, '</div>\n                                    </div>');

content = content.replace(/<Box\s+sx=\{\{.*?border: "1px solid #ddd".*?\}\}\s*>/gs, '<div className="border border-gray-200 rounded-md p-2 bg-white flex items-center justify-center min-w-[200px] min-h-[100px] max-w-[600px] shadow-sm">');
content = content.replace(/<\/Box>\s*<IconButton\s+color="error"/g, '</div>\n                                                    <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-700 hover:bg-red-50"');
content = content.replace(/<\/IconButton>/g, '</Button>');
content = content.replace(/<Typography variant="body2" color="text\.secondary">/g, '<p className="text-sm text-gray-500">');
content = content.replace(/<\/Typography>/g, '</p>');


// Add end of file fix
content = content.replace(/<\/Box>\s*<\/ProtectedRoute>/g, '</div>\n        </ProtectedRoute>');


fs.writeFileSync(path, content);
console.log('Tabs and Tables Refactoring completed.');

