Map.setOptions('HYBRID');
///////////////////////////////////////////////////////////////////
//Before Fire-------------------------------------------------
var BeforeFire = ee.ImageCollection('COPERNICUS/S2_SR')
 .filterDate('2019-07-13','2019-07-15')
 .sort('CLOUD_COVER')
 .filterBounds(box)
 .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'less_than', 20);
 
 //After Fire-------------------------------------------------
var AfterFire = ee.ImageCollection('COPERNICUS/S2_SR')
 .filterDate('2019-10-06','2019-10-08')
 .sort('CLOUD_COVER')
 .filterBounds(box)
 .filterMetadata('CLOUDY_PIXEL_PERCENTAGE', 'less_than', 20);
//Map.addLayer(jan_feb, {}, 'Jan Feb perimeter');
//////////////////////////////////////////////////////////////////
//Before fire calculations
var NIR = BeforeFire.select(['B8']);
var SWIR = BeforeFire.select(['B12']);
var SCL = BeforeFire.select(['SCL']);
var QA60 = BeforeFire.select(['QA60']);

//print('NIR_BeforeCollection: ', NIR);
//print('SWIR_BeforeCollection: ', SWIR);
//
var NIRmean = NIR.reduce(ee.Reducer.mean());
var SWIRmean = SWIR.reduce(ee.Reducer.mean());

// Function to calculate and add an NDVI band
var beforeNBR = function(BeforeImage) {
  var SCL = BeforeImage.select(['SCL']);
  var QA60 = BeforeImage.select(['QA60']);
  var NIR = BeforeImage.select(['B8']);
  var SWIR = BeforeImage.select(['B12']);
  var NBR_func =  BeforeImage.expression('(NIRmean - SWIRmean)/(NIRmean + SWIRmean)', {
  'NIRmean': NIR,
  'SWIRmean': SWIR});
  return NBR_func.addBands([SCL,QA60,SWIR]).select([0,1,2,3], ['NBR_func', 'SCL', 'QA60','SWIR']);
};


// Function to mask cloud from built-in SCL band
var SCL_remove = function(image) {
  var SCL = image.select(['SCL']);
  return image.updateMask(SCL.gte(4).and(SCL.lt(9)));
};

// Function to mask cloud from built-in quality band
var Cloud_remove = function(image2) {
  var QA60 = image2.select(['QA60']);
  return image2.updateMask(QA60.lt(1));
};

var flame_remove_before = function(image5) {
  var SWIR = image5.select(['SWIR']);
  return image5.updateMask(SWIR.lt(3000));
};

// Add NDVI band to image collection
var S2 = BeforeFire.map(beforeNBR).map(SCL_remove);
var S2_clouds = S2.map(Cloud_remove);
var S2_flames_before = S2_clouds.map(flame_remove_before);
var BeforeFireMin = S2_flames_before.reduce(ee.Reducer.min());
var Before_fire_NBR = BeforeFireMin.select(['NBR_func_min']);


var nbrParams_before = {min: -0.5, max: 0.5, palette: ['white', 'green']};
//Map.addLayer(Before_fire_NBR, nbrParams_before, 'NBR image Before');

////////////////////////////////////////////////////////////////////////////////////
//After fire calculations
var NIR_after = AfterFire.select(['B8']);
var SWIR_after = AfterFire.select(['B12']);
var SCL_after = AfterFire.select(['SCL']);
var QA60_after = AfterFire.select(['QA60']);

//print('NIR_BeforeCollection: ', NIR_after);
//print('SWIR_BeforeCollection: ', SWIR_after);
//
var NIRmean_after = NIR_after.reduce(ee.Reducer.mean());
var SWIRmean_after = SWIR_after.reduce(ee.Reducer.mean());

// Function to calculate and add an NDVI band
var afterNBR = function(AfterImage) {
  var SCL_after = AfterImage.select(['SCL']);
  var QA60_after = AfterImage.select(['QA60']);
  var NIR_after = AfterImage.select(['B8']);
  var SWIR_after = AfterImage.select(['B12']);
  var NBR_func_after =  AfterImage.expression('(NIRmean - SWIRmean)/(NIRmean + SWIRmean)', {
  'NIRmean': NIR_after,
  'SWIRmean': SWIR_after});
  return NBR_func_after.addBands([SCL_after,QA60_after,SWIR_after]).select([0,1,2,3], ['NBR_func_after', 'SCL_after', 'QA60_after','SWIR_after']);
};

// Function to mask cloud from built-in SCL band
var SCL_remove_after = function(image3) {
  var SCL_after = image3.select(['SCL_after']);
  return image3.updateMask(SCL_after.gte(4).and(SCL_after.lt(9)));
};

// Function to mask cloud from built-in quality band
var Cloud_remove_after = function(image4) {
  var QA60_after = image4.select(['QA60_after']);
  return image4.updateMask(QA60_after.lt(1));
};

var flame_remove = function(image5) {
  var SWIR_after = image5.select(['SWIR_after']);
  return image5.updateMask(SWIR_after.lt(3000));
};

// Add NDVI band to image collection
var S2_after = AfterFire.map(afterNBR).map(SCL_remove_after);
var S2_clouds_after = S2_after.map(Cloud_remove_after);
var S2_flames_after = S2_clouds_after.map(flame_remove);
var AfterFireMin = S2_flames_after.reduce(ee.Reducer.min());


var After_fire_NBR = AfterFireMin.select(['NBR_func_after_min']);

var nbrParams_after = {min: -0.5, max: 0.5, palette: ['white', 'blue']};
//Map.addLayer(After_fire_NBR, nbrParams_after, 'NBR image after');

////////////////////////////////////////////////////////////////////////////////
//Change in NBR---------------------------------------------
var DiffNBR = Before_fire_NBR.subtract(After_fire_NBR);
var burnt = DiffNBR.updateMask(DiffNBR.gt(0.13));
Map.addLayer(burnt,{}, 'burnt_area');
//cleaning to just forest
var forest = hansen.select(['treecover2000']).gte(10);//.and(hansen.select(['treecover2000']).lt(30));
var NBR_only_forest = DiffNBR.updateMask(forest);
var difference_mapNBR = NBR_only_forest.updateMask(NBR_only_forest.gt(0.13));

//For the error values
var difference_mapNBR = NBR_only_forest.updateMask(NBR_only_forest.lte(0.13));
//Just within the fire footprint
var within_fire_footprint = difference_mapNBR.clip(jan_feb);
var forest_within = forest.clip(nov);

var diffNBRparams = {min: 0.1, max: 1.5, palette: ['pink', 'red']};
Map.addLayer(within_fire_footprint, diffNBRparams, 'Change_NBR');


/////////////////////////////////////////////////////////////////////////////////
//Reclassifying the NBR difference and calculating area values
var ALL_BURNT = within_fire_footprint.updateMask(within_fire_footprint.gte(0.13));
var low_severity = within_fire_footprint.updateMask(within_fire_footprint.gte(0.13).and(within_fire_footprint.lt(0.27)));
var low_med_severity = within_fire_footprint.updateMask(within_fire_footprint.gte(0.27).and(within_fire_footprint.lt(0.44)));
var high_med_severity = within_fire_footprint.updateMask(within_fire_footprint.gte(0.44).and(within_fire_footprint.lt(0.66)));
var high_severity = within_fire_footprint.updateMask(within_fire_footprint.gte(0.66));


//Map.addLayer(ALL_BURNT);

//Setting up the area export values
//var total_forest = forest_within.multiply(ee.Image.pixelArea());
var areaALL_BURNT = ALL_BURNT.multiply(ee.Image.pixelArea()); //Total area in m2
var areaLow_severity = low_severity.multiply(ee.Image.pixelArea()); //Total area in m2 
var areaLow_med_severity = low_med_severity.multiply(ee.Image.pixelArea()); //Total area in m2 
var areaHigh_med_severity = high_med_severity.multiply(ee.Image.pixelArea()); //Total area in m2 
var areaHigh_severity = high_severity.multiply(ee.Image.pixelArea()); //Total area in m2 
// These are to prevent too many pixels being calculated, otherwise an error is given.
var sf = 20; //scale factor
var mp = 1e13; //max pixels

//// Calculating the total forest area
var statsTotalForest = total_forest.reduceRegion({
  reducer: ee.Reducer.sum(),
  geometry: Area_box,
  scale: sf,
  maxPixels: mp
});

// Calculating the total area burnt
var statsALL_BURN = areaALL_BURNT.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Area_box,
  scale: sf,
  maxPixels: mp
});

// Calculating the area of low severity
var statsLow_severity = areaLow_severity.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Area_box,
  scale: sf,
  maxPixels: mp
});

// Calculating the area of low medium severity
var statsLow_med_severity = areaLow_med_severity.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Area_box,
  scale: sf,
  maxPixels: mp
});

// Calculating the area of high medium severity
var statshaHigh_med_severity = areaHigh_med_severity.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Area_box,
  scale: sf,
  maxPixels: mp
});

// Calculating the area of high severity
var statsHigh_severity = areaHigh_severity.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Area_box,
  scale: sf,
  maxPixels: mp
});

/////////////////////////////////////////Preparing and exporting the data/////////////////////////////////////////
// Make a feature without geometry and set the properties to the dictionary of means.
//var Total_forest_feature = ee.Feature(null, statsTotalForest);
var All_burn_feature = ee.Feature(null, statsALL_BURN);
var Low_severity_feature = ee.Feature(null, statsLow_severity);
var Low_med_severity_feature = ee.Feature(null, statsLow_med_severity);
var High_med_severity_feature = ee.Feature(null, statshaHigh_med_severity);
var High_severity_feature = ee.Feature(null, statsHigh_severity);

// Wrap the Feature in a FeatureCollection for export.
var featureCollection = ee.FeatureCollection([All_burn_feature, Low_severity_feature, Low_med_severity_feature, High_med_severity_feature, High_severity_feature]);
// Export the FeatureCollection.
Export.table.toDrive({
  collection: featureCollection,
  description: 'Burn_area_woodland_jan_feb',
  fileFormat: 'CSV'
});

//Creating an unburnt forest layer
var unburnt_forest = forest.updateMask(forest.eq(1).updateMask(DiffNBR.lte(0.1)));
//Map.addLayer(unburnt_forest);
//Burnt non forest layer
var non_forest = DiffNBR.updateMask(forest.eq(0));
var burnt_non_forest = non_forest.updateMask(non_forest.gt(0.10));
Map.addLayer(burnt_non_forest);
var burnt_clip = burnt.clip(clip_boundary);
/////////////////////////////////////////////////////////////////////////////
//////Exporting the Burn Ratio values/////////////////
// Export the image, specifying scale and region.
var burnt_clip = burnt.clip(clip);
Export.image.toDrive({
  image: burnt_clip,
  description: 'Central_cooloola_burnt',
  scale:20,
  maxPixels: 1e13
});

//////Exporting the Unburnt forest/////////////////
Export.image.toDrive({
  image: unburnt_forest,
  description: 'Unburnt_forest',
  scale:20,
  maxPixels: 1e13
});

//////Exporting the Burn Non forest/////////////////
Export.image.toDrive({
  image: burnt_non_forest,
  description: 'Burnt_non_forest',
  scale:20,
  maxPixels: 1e13
});

//HISTOGRAM///////////////////////////////////////////
// Operations *before* the reproject call will be done in the projection
// specified by reproject().  The output results in another reprojection.
var reprojected = difference_mapNBR
    .reproject('EPSG:3112', null, 500);

// Pre-define some customization options.
var options = {
  title: 'Sentinel 2 Burn histogram',
  fontSize: 20,
  hAxis: {title: 'DN'},
  vAxis: {title: 'count of DN'}};

// Make the histogram, set the options.
var histogram = ui.Chart.image.histogram(reprojected,Export_poly, 20)
    .setOptions(options);

// Display the histogram.
print(histogram);
