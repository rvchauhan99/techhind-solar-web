const fs = require('fs');
const file = 'src/app/confirm-orders/components/Fabrication.js';
let content = fs.readFileSync(file, 'utf8');

const targetStart = '    const formId = `fabrication-form-${orderId}`;';
const startIndex = content.indexOf(targetStart);

if (startIndex === -1) {
    console.error("Could not find TargetStart");
    process.exit(1);
}

const newBottom = `    const formId = \`fabrication-form-\${orderId}\`;
    const formShellClass = splitLayout ? "relative flex flex-col h-full bg-slate-50 min-w-0" : "relative flex flex-col min-h-full bg-slate-50";

    const formBody = (
        <div className="flex-1 overflow-y-auto px-2 sm:px-4 pb-[100px] sm:pb-[80px]">
            <div className={splitLayout ? "py-3" : "py-4 max-w-5xl mx-auto"}>
                <FormSection title="Fabrication Execution" className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] mb-4 overflow-hidden border border-slate-200">
                    <Box className="p-3">
                        <FormGrid cols={2} className="gap-3 sm:gap-4 mb-4">
                            <DateField
                                name="fabrication_start_date"
                                label="Fabrication Start Date"
                                value={formData.fabrication_start_date}
                                onChange={handleInputChange}
                                fullWidth
                                required
                                error={!!fieldErrors.fabrication_start_date}
                                helperText={fieldErrors.fabrication_start_date}
                                disabled={disabled}
                            />
                            <DateField
                                name="fabrication_end_date"
                                label="Fabrication End Date"
                                value={formData.fabrication_end_date}
                                onChange={handleInputChange}
                                fullWidth
                                required
                                error={!!fieldErrors.fabrication_end_date}
                                helperText={fieldErrors.fabrication_end_date}
                                disabled={disabled}
                            />
                        </FormGrid>

                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: "slate.800" }}>Checklist</Typography>
                        <Box className="mt-0.5 mb-5 grid grid-cols-1 sm:grid-cols-2 gap-x-3 gap-y-0 p-3 bg-slate-50 rounded-lg border border-slate-100">
                            {checklist.map((item) => (
                                <Checkbox
                                    key={item.id}
                                    name={\`check_\${item.id}\`}
                                    label={item.label}
                                    checked={!!item.checked}
                                    onChange={(e) => handleChecklistChange(item.id, e.target.checked)}
                                    disabled={disabled}
                                />
                            ))}
                        </Box>

                        <Typography variant="subtitle2" sx={{ mb: 1.5, fontWeight: 600, color: "slate.800" }}>Required Photos</Typography>
                        <Box className="mb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                            {requiredFabricationImageKeys.map((config) => renderFabricationPhotoField(config))}
                        </Box>
                    </Box>
                </FormSection>

                <FormSection title="" className="bg-white rounded-xl shadow-[0_2px_12px_rgba(0,0,0,0.04)] mb-4 overflow-hidden border border-slate-200 px-0">
                    <details className="group">
                        <summary className="cursor-pointer select-none list-none px-4 py-3 text-sm font-bold text-slate-800 bg-slate-100 hover:bg-slate-200 border-b border-slate-200 flex items-center justify-between transition-colors">
                            <span className="flex items-center gap-2">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-settings">
                                    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
                                </svg>
                                Optional Details
                            </span>
                            <span className="text-xs font-normal text-slate-500 group-open:hidden transition-opacity">
                                Tap to expand
                            </span>
                        </summary>
                        <div className="p-3 sm:p-4 flex flex-col gap-5 border-t border-slate-100 bg-white">
                            {optionalFabricationImageKeys.length > 0 && (
                                <Box>
                                    <Typography variant="caption" className="mb-2 block font-semibold text-slate-700">Optional Photos</Typography>
                                    <Box className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
                                        {optionalFabricationImageKeys.map((config) => renderFabricationPhotoField(config))}
                                    </Box>
                                </Box>
                            )}

                            <FormGrid cols={2} className="gap-3 sm:gap-4">
                                <AutocompleteField
                                    name="structure_type"
                                    label="Structure Type"
                                    options={FABRICATION_STRUCTURE_TYPES}
                                    getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? "")}
                                    value={formData.structure_type || null}
                                    onChange={(e, newValue) => handleInputChange({ target: { name: "structure_type", value: newValue ?? "" } })}
                                    fullWidth
                                    disabled={disabled}
                                />
                                <AutocompleteField
                                    name="structure_material"
                                    label="Structure Material"
                                    options={FABRICATION_STRUCTURE_MATERIALS}
                                    getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? "")}
                                    value={formData.structure_material || null}
                                    onChange={(e, newValue) => handleInputChange({ target: { name: "structure_material", value: newValue ?? "" } })}
                                    fullWidth
                                    disabled={disabled}
                                />
                                <AutocompleteField
                                    name="coating_type"
                                    label="Coating Type"
                                    options={FABRICATION_COATING_TYPES}
                                    getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? "")}
                                    value={formData.coating_type || null}
                                    onChange={(e, newValue) => handleInputChange({ target: { name: "coating_type", value: newValue ?? "" } })}
                                    fullWidth
                                    disabled={disabled}
                                />
                                <AutocompleteField
                                    name="tilt_angle"
                                    label="Tilt Angle"
                                    options={FABRICATION_TILT_ANGLES}
                                    getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? "")}
                                    value={formData.tilt_angle || null}
                                    onChange={(e, newValue) => handleInputChange({ target: { name: "tilt_angle", value: newValue ?? "" } })}
                                    fullWidth
                                    disabled={disabled}
                                />
                                <AutocompleteField
                                    name="height_from_roof"
                                    label="Height from Roof (mm)"
                                    options={FABRICATION_HEIGHT_FROM_ROOF}
                                    getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? "")}
                                    value={formData.height_from_roof || null}
                                    onChange={(e, newValue) => handleInputChange({ target: { name: "height_from_roof", value: newValue ?? "" } })}
                                    fullWidth
                                    disabled={disabled}
                                />
                                <AutocompleteField
                                    name="labour_category"
                                    label="Labour Category"
                                    options={FABRICATION_LABOUR_CATEGORIES}
                                    getOptionLabel={(o) => (typeof o === "string" ? o : o?.label ?? "")}
                                    value={formData.labour_category || null}
                                    onChange={(e, newValue) => handleInputChange({ target: { name: "labour_category", value: newValue ?? "" } })}
                                    fullWidth
                                    disabled={disabled}
                                />
                                <Input
                                    name="labour_count"
                                    label="Labour Count"
                                    type="number"
                                    value={formData.labour_count}
                                    onChange={handleInputChange}
                                    fullWidth
                                    disabled={disabled}
                                />
                            </FormGrid>
                            <Input
                                name="remarks"
                                label="Remarks"
                                multiline
                                value={formData.remarks}
                                onChange={handleInputChange}
                                fullWidth
                                disabled={disabled}
                            />
                        </div>
                    </details>
                </FormSection>
            </div>
        </div>
    );

    const actionsFooter = (
        <Box 
            className="sticky bottom-0 z-40 px-3 py-3 sm:px-6 sm:py-4 mt-auto border-t shadow-[0_-8px_16px_rgba(0,0,0,0.06)] backdrop-blur-xl bg-white/90"
            sx={{ pb: 'calc(env(safe-area-inset-bottom) + 12px)' }}
        >
            <div className="max-w-5xl mx-auto flex flex-col gap-2">
                <Box className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 relative">
                    <Box className="flex-1">
                        {error && <Typography variant="caption" color="error.main" fontWeight={500} display="block" className="animate-in slide-in-from-bottom-2 fade-in relative px-3 py-1.5 bg-red-50 rounded-md border border-red-100">{error}</Typography>}
                        {successMsg && <Typography variant="caption" color="success.main" fontWeight={500} display="block" className="animate-in slide-in-from-bottom-2 fade-in relative px-3 py-1.5 bg-green-50 rounded-md border border-green-100">{successMsg}</Typography>}
                        {!canComplete && orderData?.stages?.planner !== "completed" && !isStageCompleted && !error && !successMsg && (
                            <Typography variant="caption" color="text.secondary" display="block">
                                Complete Planner stage to unlock Fabrication
                            </Typography>
                        )}
                        {!error && !successMsg && (canComplete || isStageCompleted) && (
                            <Typography variant="caption" color="text.secondary" display="block">
                                <span className={isCompleted ? "text-green-600 font-medium flex items-center gap-1" : ""}>
                                    {isCompleted ? <span className="inline-block w-2 h-2 rounded-full bg-green-500 animate-pulse"></span> : null}
                                    {isCompleted ? "Fabrication Completed" : "Audit-ready details"}
                                </span>
                            </Typography>
                        )}
                    </Box>

                    <div className="flex flex-col sm:flex-row gap-2 max-w-full">
                        <Button
                            type="submit"
                            form={formId}
                            variant="secondary"
                            className="min-h-[44px] h-auto flex-1 sm:flex-none shadow-sm touch-manipulation hover:bg-slate-200 transition-colors"
                            loading={submitting}
                            disabled={disabled} 
                        >
                            <span className="font-semibold px-4">{isCompleted ? "Update Optional" : "Save Progress"}</span>
                        </Button>
                        {canComplete && (
                            <Button
                                type="button"
                                variant="default"
                                className="min-h-[44px] h-auto flex-1 sm:flex-none shadow-md touch-manipulation bg-emerald-600 hover:bg-emerald-700 text-white transition-all active:scale-[0.98]"
                                loading={submitting}
                                onClick={(e) => handleSubmit(e, true)}
                                disabled={disabled}
                            >
                                <span className="font-semibold px-4">Complete Fabrication</span>
                            </Button>
                        )}
                    </div>
                </Box>
            </div>
        </Box>
    );

    return (
        <Box
            component="form"
            id={formId}
            onSubmit={(e) => handleSubmit(e, false)}
            onKeyDown={preventEnterSubmit}
            className={formShellClass}
        >
            {formBody}
            {actionsFooter}

            {/* Photo Preview Dialog */}
            <Dialog open={!!photoPreview} onOpenChange={(open) => !open && setPhotoPreview(null)}>
                <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden bg-black/95 border-none">
                    <DialogHeader className="p-4 absolute top-0 w-full z-0 pointer-events-none bg-gradient-to-b from-black/80 to-transparent">
                        <DialogTitle className="text-white text-sm font-medium pr-8 pointer-events-auto">
                            {photoPreview?.title}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="relative w-full h-[60vh] sm:h-[80vh] flex items-center justify-center p-4 pt-14 pointer-events-none">
                        {photoPreview?.isPending ? (
                            <img 
                                src={photoPreview.src} 
                                alt={photoPreview.title}
                                className="max-w-full max-h-full object-contain pointer-events-auto"
                            />
                        ) : photoPreview?.src ? (
                            <Box className="pointer-events-auto w-full h-full">
                                <BucketImage
                                    path={photoPreview.src}
                                    getUrl={getDocumentUrlById}
                                    alt={photoPreview.title}
                                    sx={{ width: '100%', height: '100%', objectFit: 'contain', borderRadius: 0 }}
                                />
                            </Box>
                        ) : null}
                    </div>
                </DialogContent>
            </Dialog>
        </Box>
    );
}
`;

content = content.substring(0, startIndex) + newBottom;
fs.writeFileSync(file, content, 'utf8');
