//Setting the base map to  hybrid
Map.setOptions('HYBRID');
Map.setCenter(153.18, -30.5, 6);

//Importing the rasters from the GDAL processing on local computer
var combined_image = ee.ImageCollection([sep,oct,nov,dec,bm,jan,jan_feb_clean]);

//Fire perimeter merge
var firePerimeterCollection = ee.FeatureCollection([sep_per,oct_per,nov_per,dec_per,janfeb_per]);
var sep_peri_feature = ee.Feature(sep_per);
var oct_peri_feature = ee.Feature(oct_per);
var fire_poly_intersection = sep_peri_feature.union(oct_peri_feature, ee.ErrorMargin(1));
var fire_perimeter = firePerimeterCollection.flatten();
var fire_perimeter2 = ee.Feature(fire_perimeter);
var fire_perimeter_union = fire_perimeter2.dissolve();
Map.addLayer(fire_perimeter);


var maximum_burn = combined_image.max();
var tenure_difference = maximum_burn.clip(perimeter);

var forest = hansen.select(['treecover2000']).gte(10);//.and(hansen.select(['treecover2000']).lt(30));
var NBR_only_forest = maximum_burn.updateMask(forest);
var forestProjection = forest.projection();

//If wanting to include only protected areas impacted
//var tenure_difference = NBR_only_forest.clip(protected_areas);

    
///////////////////////////////////////////////////////////////////////////////////////
//Creating an unburnt forest layer within the perimeter
var jan_cleaned = jan_error.updateMask(jan_error.eq(0.01));
var unburnt_within = ee.ImageCollection([sep_error,oct_error,nov_error,dec_error,janfeb_error,bm_error,jan_cleaned]);
var unburnt_max = unburnt_within.max();

//reclassifying the new unburnt max all as one
var unburnt_reclassified = unburnt_max.lte(0.13);
var all_burn_processing = maximum_burn.gte(2).unmask(0);
var unburnt_reclass_clean = unburnt_reclassified.updateMask(all_burn_processing.neq(1)).clip(fire_perimeter_no_holes);
//Map.addLayer(unburnt_reclass_clean,{min: 0, max: 0.13, palette: ['green', 'green']},'unburnt_reclassified');
//Map.addLayer(all_burn_processing,{},'maximum_burn');


// Get the forest cover data at Tree height scale and projection.
var NBR_reproj = NBR_only_forest
    // Force the next reprojection to aggregate instead of resampling.
    // Request the data at the scale and projection of the height image
    .reproject({
      crs: forestProjection
    })
    .reduceResolution({
      reducer: ee.Reducer.mode()
    });

//Getting the layers all together with the forest as a background
var NBR_unmasked = NBR_reproj.unmask(0, false);
var NBR_unmasked_forest = NBR_unmasked.updateMask(forest);

////////////////////////////////////////////////////////////////////////////////////////
//Now to remove the areas of forest that intersect a road
var not_road = roads.neq(1);
//Map.addLayer(not_road,{}, 'road');
var no_roads_NBR = NBR_unmasked_forest.updateMask(not_road);

////////////////////////////////////////////////////////////////////////////////////////
//Reprojecting the NBR layer before exporting each of the severities
var reprojected = no_roads_NBR
    .reproject('EPSG:3112', null, 20);

var diffNBRparams = {min: 0, max: 5, palette: ['green', 'red']};
//Map.addLayer(reprojected, diffNBRparams, 'Max_NBR_no_roads');

///////////////////////////////////////////////////////////////////////////////////////
//Clipping out all the layers to within the IBRA regions
var clipped_NBR = reprojected.clip(IBRA);
Map.addLayer(clipped_NBR, diffNBRparams, 'Max_NBR_no_roads');

var unburnt_forest = reprojected.updateMask(reprojected.eq(0));
var low_severity = reprojected.updateMask(reprojected.eq(2));
var low_med_severity = reprojected.updateMask(reprojected.eq(3));
var high_med_severity = reprojected.updateMask(reprojected.eq(4));
var high_severity = reprojected.updateMask(reprojected.eq(5));
Map.addLayer(unburnt_forest, diffNBRparams, 'unburnt_forest');


// These are to prevent too many pixels being calculated, otherwise an error is given.
var sf = 20; //scale factor
var mp = 1e13; //max pixels

//-------------------------------------------------------------------------------------
//var fire_perimeter_no_holes_geo = fire_perimeter_no_holes.geometry();
//var fire_perimeter_no_holes_other_tenure = fire_perimeter_no_holes_geo.difference(protected_areas).difference(state_forests);
//Map.addLayer(fire_perimeter_no_holes_other_tenure, {}, 'fire_perimeter_no_holes_other_tenure');

//Clipping out all the layers to within the fire perimeter
//making 2 layers for unburnt habitat
//var clipped_NBR = reprojected.clip(protected_areas);//.clip(protected_areas);
//Map.addLayer(clipped_NBR, diffNBRparams, 'Max_NBR_no_roads');

//var unburnt_forest = clipped_NBR.updateMask(clipped_NBR.eq(0)).toInt();
var unburnt_and_low = clipped_NBR.updateMask(clipped_NBR.gte(2).and(clipped_NBR.lte(3))).toInt();
//var all_burnt = clipped_NBR.eq(5).toInt();
var all_burnt_mask = unburnt_and_low.updateMask(unburnt_and_low.eq(2));
Map.addLayer(all_burnt_mask, {}, 'low and mod low severities');
//
var vectors = all_burnt_mask.reduceToVectors({
  geometry: Area_box,
  scale: 20,
  geometryType: 'polygon',
  eightConnected: false,
  labelProperty: 'zone',
  bestEffort: true,
  maxPixels:mp
});

//var all_burnt_union = vectors.union(1);
//var allburt_geom = all_burnt_union.geometry();
//var IBRA_flatten = ee.FeatureCollection(IBRA_sub).filterBounds(allburt_geom);
//var IBRA_sub_clip = IBRA_flatten.union(all_burnt_union);

//Map.addLayer(all_burnt_mask, {}, 'all_burnt_mask');


// Export the FeatureCollection to SHP.
Export.table.toDrive({
  collection: vectors,
  description:'Unburnt_and_low_polygons4',
  fileFormat: 'SHP'
});



//-------------------------------------------------------------------------------------


//// Calculating the total area burnt
var statsALL_BURN = ALL_BURNT.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Area_box,
  scale: sf,
  maxPixels: mp
});
// Calculating the area of low severity
var statsLow_severity = low_severity.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Area_box,
  scale: sf,
  maxPixels: mp
});
//
////print(statsLow_severity);
//
//// Calculating the area of low medium severity
var statsLow_med_severity = low_med_severity.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Area_box,
  scale: sf,
  maxPixels: mp
});
//
//// Calculating the area of high medium severity
var statshaHigh_med_severity = high_med_severity.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Area_box,
  scale: sf,
  maxPixels: mp
});
//
//// Calculating the area of high severity
var statsHigh_severity = high_severity.reduceRegion({
  reducer: ee.Reducer.count(),
  geometry: Area_box,
  scale: sf,
  maxPixels: mp
});
//
///////////////////////////////////////////Preparing and exporting the data/////////////////////////////////////////
//// Make a feature without geometry and set the properties to the dictionary of means.
//var Total_forest_feature = ee.Feature(null, statsTotalForest);
//var All_burn_feature = ee.Feature(null, statsALL_BURN);
var Low_severity_feature = ee.Feature(null, statsLow_severity);
var Low_med_severity_feature = ee.Feature(null, statsLow_med_severity);
var High_med_severity_feature = ee.Feature(null, statshaHigh_med_severity);
var High_severity_feature = ee.Feature(null, statsHigh_severity);
//
// Wrap the Feature in a FeatureCollection for export.
//var featureCollection = ee.FeatureCollection([Low_severity_feature, Low_med_severity_feature, High_med_severity_feature, High_severity_feature]);
// Export the FeatureCollection.
Export.table.toDrive({
  collection: featureCollection,
  description: 'Burn_area_forests30_protected_areas_new',
  fileFormat: 'CSV'
});

//Exporting the entire burnt area
Export.image.toDrive({
  image: all_burnt_mask,
  description: 'Burnt_within_perimeter',
  scale:20,
  maxPixels: 1e13
});
// Export the image, specifying scale and region.
Export.image.toDrive({
  image: unburnt_forest,
  description: 'Unburnt_forest_within_perimeter3',
  scale:20,
  maxPixels: 1e13
});
Export.image.toDrive({
  image: unburnt_and_low,
  description: 'Unburnt_forest_and_low_within_perimeter3',
  scale:20,
  maxPixels: 1e13
});
Export.image.toDrive({
  image: low_med_severity,
  description: 'NBR_max_low_med2',
  scale:20,
  maxPixels: 1e13
});
Export.image.toDrive({
  image: high_med_severity,
  description: 'NBR_max_high_med2',
  scale:20,
  maxPixels: 1e13
});
Export.image.toDrive({
  image: high_severity,
  description: 'NBR_max_high1',
  scale:20,
  maxPixels: 1e13
});//