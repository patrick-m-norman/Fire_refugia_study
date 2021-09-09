//----------------------------------------------------------------------------------------------
//MAX AND MIN FOR VALUES TO ESTABLISH RANGE
// import data
var collection = ee.ImageCollection("MODIS/006/MOD09A1")
    .filterBounds(region);
 
// Define dates
var iniDate = ee.Date.fromYMD(2014,8,1);
var endDate = ee.Date.fromYMD(2019,7,31);
 
// bands
var modisBands = ['sur_refl_b03','sur_refl_b04','sur_refl_b01','sur_refl_b02','sur_refl_b05','sur_refl_b06','sur_refl_b07'];

var col_NDIIb6 = function(image) {
  return image.addBands(
    image.normalizedDifference(['sur_refl_b02', 'sur_refl_b06']).rename('NDIIb6'));
};

var col_VARI = function(image) {
  return  image.addBands(
  image.select('sur_refl_b04').subtract(image.select('sur_refl_b01'))
  .divide(image.select('sur_refl_b04').add(image.select('sur_refl_b01').subtract(image.select('sur_refl_b03'))))
  .rename('VARI'));
};

// helper function to extract the QA bits
function getQABits(image, start, end, newName) {
 // Compute the bits we need to extract.
 var pattern = 0;
 for (var i = start; i <= end; i++) {
 pattern += Math.pow(2, i);
 }
 // Return a single band image of the extracted QA bits, giving the band
 // a new name.
 return image.select([0], [newName])
 .bitwiseAnd(pattern)
 .rightShift(start);
}
 
// A function to mask out cloudy pixels.
function maskQuality(image) {
 // Select the QA band.
 var QA = image.select('StateQA');
 // Get the internal_cloud_algorithm_flag bit.
 var internalQuality = getQABits(QA,8, 13, 'internal_quality_flag');
 // Return an image masking out cloudy areas.
 return image.updateMask(internalQuality.eq(0));
}
 
// create cloud free composite
var noCloud = collection.filterDate(iniDate,endDate)
  .map(col_NDIIb6).map(col_VARI)
  .map(maskQuality);
 
//print(noCloud);

// vis parameters
//var visParams = {bands:['red','green','blue'],min:0,max:3000,gamma:1.3};
 
// add the cloud free composite
//Map.addLayer(noCloud.mean(),{},'MODIS Composite');

//----------------------------------------------------------------------------------------------
//EACH MONTHS VALUES AND FINAL EQUATIONS

var month = DEC;

// Define dates
var iniDate_perMonth = ee.Date.fromYMD(2019,12,1);
var endDate_perMonth = ee.Date.fromYMD(2019,12,31);

// monthly calculations
var noCloud_month = collection.filterDate(iniDate_perMonth,endDate_perMonth)
  .map(col_NDIIb6).map(col_VARI)
  .map(maskQuality);

// VARI calcs

var VARI_max = noCloud.select(['VARI']).max().clip(month);
var VARI_min = noCloud.select(['VARI']).min().clip(month);
var VARI_b4fire = noCloud_month.select(['VARI']).mode().clip(month);

var VARI_SI = VARI_b4fire.expression('(VARI_b4fire - VARI_min)/(VARI_max - VARI_min)', {
  'VARI_b4fire': VARI_b4fire,
  'VARI_min': VARI_min,
  'VARI_max': VARI_max});

//print(VARI_max);
//Map.addLayer(VARI_SI,{},'VARI_SI');

// NDIIb6 calcs

var NDIIb6_max = noCloud.select(['NDIIb6']).max().clip(month);
var NDIIb6_min = noCloud.select(['NDIIb6']).min().clip(month);
var NDIIb6_b4fire = noCloud_month.select(['NDIIb6']).mode().clip(month);

var NDIIb6_SI = VARI_b4fire.expression('(NDIIb6_b4fire - NDIIb6_min)/(NDIIb6_max - NDIIb6_min)', {
  'NDIIb6_b4fire': NDIIb6_b4fire,
  'NDIIb6_min': NDIIb6_min,
  'NDIIb6_max': NDIIb6_max});

//print(VARI_max);
//Map.addLayer(NDIIb6_SI,{},'NDIIb6_SI');

// Export the image, specifying scale and region.
Export.image.toAsset({
  image: VARI_SI,
  description: 'VARI_SI_DEC',
  scale:500,
  maxPixels: 1e13
});

// Export the image, specifying scale and region.
Export.image.toAsset({
  image: NDIIb6_SI,
  description: 'NDIIb6_SI_DEC',
  scale:500,
  maxPixels: 1e13
});