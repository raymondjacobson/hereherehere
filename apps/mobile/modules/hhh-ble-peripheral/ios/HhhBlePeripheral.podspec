Pod::Spec.new do |s|
  s.name           = 'HhhBlePeripheral'
  s.version        = '1.0.0'
  s.summary        = 'CoreBluetooth peripheral (advertise + serve) for the hereherehere mesh.'
  s.description    = 'Advertises the hereherehere GATT service and serves RX/TX characteristics so two phones can mesh — the peripheral half react-native-ble-plx lacks.'
  s.author         = 'hereherehere'
  s.homepage       = 'https://hereherehere.app'
  s.license        = 'MIT'
  s.platforms      = { :ios => '15.1' }
  s.source         = { :git => '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.pod_target_xcconfig = {
    'DEFINES_MODULE' => 'YES',
    'SWIFT_COMPILATION_MODE' => 'wholemodule'
  }

  s.source_files = '**/*.{h,m,mm,swift}'
end
